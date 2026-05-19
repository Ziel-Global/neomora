import apiClient from './apiClient';
import { Delegation } from '@/lib/teamStore';

export interface CreateDelegationPayload {
    eventId: string;
    country: string;
    teamIds?: string[];
}

export const createDelegation = async (payload: CreateDelegationPayload): Promise<Delegation> => {
    const { data } = await apiClient.post('/delegations', payload);
    return data;
};

export const getDelegationsDetails = async (): Promise<Delegation[]> => {
    const endpoints = ['/me/delegations', '/delegations/me', '/delegations'];
    for (const endpoint of endpoints) {
        try {
            const { data } = await apiClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.delegations || []);
            if (Array.isArray(result) && result.length > 0) return result;
            if (Array.isArray(result)) return result;
        } catch (err: any) {
            if (err?.response?.status !== 404) console.error(`Error fetching from ${endpoint}:`, err);
        }
    }
    return [];
};

export const getDelegationById = async (id: string): Promise<Delegation> => {
    const { data } = await apiClient.get(`/delegations/${id}`);
    return data;
};

export const updateDelegation = async (id: string, payload: Partial<Delegation>): Promise<Delegation> => {
    const { data } = await apiClient.patch(`/delegations/${id}`, payload);
    return data;
};

export const submitDelegation = async (id: string): Promise<Delegation> => {
    const { data } = await apiClient.post(`/delegations/${id}/submit`);
    return data;
};

// Admin: get all delegations across all managers
// Admin doesn't have access to /me/delegations, so reconstruct from registrations
export const getAllDelegations = async (): Promise<any[]> => {
    try {
        // First try to fetch natively if the endpoint exists
        try {
            console.log('[API] Attempting to fetch native admin delegations from multiple endpoints');
            const adminEndpoints = ['/delegations/admin/all', '/admin/delegations', '/delegations'];
            for (const ep of adminEndpoints) {
                try {
                    const res = await apiClient.get(ep);
                    const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.delegations || []);
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`[API] Successfully got ${data.length} delegations natively from ${ep}`);
                        return data.map((d: any) => {
                            // Normalize teamIds and members arrays from native delegation
                            const teamIds = d.teamIds || d.team_ids || d.teams || [];
                            const normalizedTeamIds = Array.isArray(teamIds)
                                ? teamIds.map(t => typeof t === 'object' ? (t.id || t._id) : t).filter(Boolean)
                                : [];

                            const members = d.members || d.participant || [];
                            const normalizedMembers = Array.isArray(members) ? members : (members ? [members] : []);

                            return {
                                ...d,
                                id: d.id || d._id,
                                teamIds: normalizedTeamIds,
                                members: normalizedMembers,
                                totalMembers: d.totalMembers || normalizedMembers.length || 0,
                                _sourceType: 'native'
                            };
                        });
                    }
                } catch (epErr) {
                    // Continue to next endpoint
                }
            }
        } catch (nativeErr: any) {
            console.log('[API] Native admin delegations attempt finished, moving to fallback if needed', nativeErr?.response?.status);
        }

        console.log('[API] Fetching delegations from registrations/admin/all');
        const regsResponse = await apiClient.get('/registrations/admin/all');
        const registrations = Array.isArray(regsResponse.data) ? regsResponse.data : (regsResponse.data?.data || []);
        console.log('[API] Got registrations:', registrations.length);

        // Extract unique delegations from registrations
        const delegationMap = new Map<string, any>();
        for (const reg of registrations) {
            // Group by TEAM ID - each team is a separate delegation
            let groupingKey = reg.teamId || reg.team_id || (reg.team && typeof reg.team === 'object' ? (reg.team.id || reg.team._id) : reg.team);

            // If no teamId, use delegation ID if available
            if (!groupingKey) {
                groupingKey = reg.delegationId || reg.delegation_id;
            }

            // If still no grouping key, skip this registration
            if (!groupingKey) {
                console.warn('[API] Skipping registration without teamId or delegationId:', reg.email);
                continue;
            }

            if (!delegationMap.has(groupingKey)) {
                // Try to find team details
                let teamName = 'Unknown Team';
                if (reg.team && typeof reg.team === 'object') {
                    teamName = reg.team.name || reg.team.sportCategory || 'Unknown Team';
                }

                // Try to find country/delegation country
                let country = reg.country || 'Unknown';
                if (country === 'Unknown' && reg.participant) {
                    country = reg.participant.country || reg.participant.nationality || 'Unknown';
                }
                if (country === 'Unknown' && reg.team && typeof reg.team === 'object') {
                    country = reg.team.country || 'Unknown';
                }
                if (country === 'Unknown' && reg.delegation && typeof reg.delegation === 'object') {
                    country = reg.delegation.country || 'Unknown';
                }

                // Try to find event ID
                let eventId = reg.eventId || reg.event_id;
                if (!eventId && reg.event) {
                    eventId = typeof reg.event === 'object' ? (reg.event.id || reg.event._id) : reg.event;
                }
                if (!eventId && reg.team && typeof reg.team === 'object') {
                    eventId = reg.team.eventId || reg.team.event_id;
                }

                // Try to find manager name
                let managerName = reg.managerName || reg.manager_name;
                if (!managerName && reg.manager) {
                    managerName = typeof reg.manager === 'object' ? (reg.manager.name || reg.manager.fullName || reg.manager.displayName) : reg.manager;
                }
                if (!managerName && reg.user) {
                    managerName = typeof reg.user === 'object' ? (reg.user.name || reg.user.fullName) : reg.user;
                }
                if (!managerName && reg.team && typeof reg.team === 'object') {
                    managerName = reg.team.managerName || reg.team.manager_name;
                }

                delegationMap.set(groupingKey, {
                    id: groupingKey,
                    status: reg.status || 'Submitted',
                    eventId: eventId,
                    country: country,
                    teamId: groupingKey,
                    teamName: teamName,
                    teamIds: [groupingKey],
                    managerName: managerName || `${country} Team Manager`,
                    totalMembers: 1,
                    members: [reg.participant || reg], // Keep reference to members
                    submittedAt: reg.createdAt || reg.created_at || reg.submittedAt,
                    _sourceType: 'registration'
                });
            } else if (delegationMap.has(groupingKey)) {
                // Add member to existing team delegation
                const existing = delegationMap.get(groupingKey)!;
                existing.totalMembers = (existing.totalMembers || 0) + 1;
                existing.members.push(reg.participant || reg);
            }
        }

        const delegationsFromRegs = Array.from(delegationMap.values());
        console.log('[API] Extracted delegations from registrations:', delegationsFromRegs.length);
        return delegationsFromRegs;
    } catch (err: any) {
        console.error('[API] Error fetching delegations from registrations:', {
            status: err?.response?.status,
            message: err?.message
        });
        return [];
    }
};

// Admin: approve or reject a delegation
export const updateDelegationStatus = async (id: string, status: 'Approved' | 'Rejected', reason?: string): Promise<any> => {
    try {
        if (status === 'Approved') {
            console.log(`[API] Approving delegation ${id}`);
            const { data } = await apiClient.post(`/delegations/${id}/approve`);
            return data;
        } else {
            console.log(`[API] Rejecting delegation ${id}`, reason);
            const { data } = await apiClient.post(`/delegations/${id}/reject`, reason ? { reason } : {});
            return data;
        }
    } catch (err: any) {
        console.error(`[API] Error updating delegation status:`, {
            status: err?.response?.status,
            message: err?.message,
            data: err?.response?.data
        });
        throw err;
    }
};
