import apiClient from './apiClient';
import { Delegation } from '@/lib/teamStore';

export interface CreateDelegationPayload {
    eventId: string;
    country: string;
    managerId?: string;
    teamIds?: string[];
}

export const createDelegation = async (payload: CreateDelegationPayload): Promise<Delegation> => {
    const { data } = await apiClient.post('/delegations', payload);
    return data;
};

export const getMyDelegations = async (): Promise<Delegation[]> => {
    const endpoints = ['/me/delegations', '/delegations/me', '/delegations'];
    for (const endpoint of endpoints) {
        try {
            const { data } = await apiClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.delegations || []);
            if (Array.isArray(result)) {
                return result.map((del: any) => ({
                    ...del,
                    id: del.id || del._id,
                }));
            }
        } catch (err: any) {
            if (err?.response?.status !== 404) console.error(`Error fetching from ${endpoint}:`, err);
        }
    }
    return [];
};

export const getDelegationsDetails = async (): Promise<Delegation[]> => {
    const endpoints = ['/me/delegations', '/delegations/me', '/delegations'];
    let delegations: any[] = [];
    for (const endpoint of endpoints) {
        try {
            const { data } = await apiClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.delegations || []);
            if (Array.isArray(result)) {
                delegations = result;
                if (result.length > 0) break;
            }
        } catch (err: any) {
            if (err?.response?.status !== 404) console.error(`Error fetching from ${endpoint}:`, err);
        }
    }

    if (delegations.length === 0) return [];

    // Fetch teams to enrich delegations with teamIds and member counts
    try {
        const teamEndpoints = ['/me/teams', '/teams/me', '/teams'];
        let teams: any[] = [];
        for (const endpoint of teamEndpoints) {
            try {
                const { data } = await apiClient.get(endpoint);
                const result = Array.isArray(data) ? data : (data?.data || data?.teams || []);
                if (Array.isArray(result)) {
                    teams = result;
                    if (result.length > 0) break;
                }
            } catch (err) {
                // Ignore
            }
        }

        // Fetch registrations to get actual member counts for teams
        let registrations: any[] = [];
        try {
            const regEndpoints = ['/me/registrations', '/registrations/me', '/registrations'];
            for (const endpoint of regEndpoints) {
                try {
                    const { data } = await apiClient.get(endpoint);
                    const result = Array.isArray(data) ? data : (data?.data || data?.registrations || []);
                    if (Array.isArray(result)) {
                        registrations = result;
                        if (result.length > 0) break;
                    }
                } catch (err) {
                    // Ignore
                }
            }
        } catch (regErr) {
            console.warn('Failed to fetch registrations for manager delegation enrichment:', regErr);
        }

        // Map team member counts based on registrations
        const teamMemberCounts = new Map<string, number>();
        for (const reg of registrations) {
            const tId = reg.teamId || reg.team_id || reg.team?.id || reg.team?._id;
            if (tId) {
                teamMemberCounts.set(tId, (teamMemberCounts.get(tId) || 0) + 1);
            }
        }

        // Group teams by delegation ID
        const delegationTeams = new Map<string, string[]>();
        const delegationMemberCounts = new Map<string, number>();

        for (const team of teams) {
            const teamId = team.id || team._id;
            let delId = team.delegationId || team.delegation_id;
            if (!delId && team.delegation) {
                delId = typeof team.delegation === 'object' ? (team.delegation.id || team.delegation._id) : team.delegation;
            }
            if (teamId && delId) {
                if (!delegationTeams.has(delId)) {
                    delegationTeams.set(delId, []);
                }
                delegationTeams.get(delId)!.push(teamId);

                // Calculate member count for this team
                const countFromRegs = teamMemberCounts.get(teamId) || 0;
                const countFromTeam = team.memberCount || team.member_count || team.members?.length || 0;
                const teamCount = Math.max(countFromRegs, countFromTeam);

                delegationMemberCounts.set(delId, (delegationMemberCounts.get(delId) || 0) + teamCount);
            }
        }

        return delegations.map(del => {
            const id = del.id || del._id;
            const teamIds = del.teamIds || del.team_ids || delegationTeams.get(id) || [];
            const totalMembers = del.totalMembers || del.total_members || delegationMemberCounts.get(id) || 0;
            return {
                ...del,
                id,
                teamIds,
                totalMembers
            };
        });
    } catch (enrichErr) {
        console.error('Failed to enrich manager delegations:', enrichErr);
        return delegations;
    }
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

const normalizeDelegationStatus = (raw?: string): string => {
    if (!raw) return 'Submitted';
    const cleaned = raw.toString().trim().toLowerCase();
    if (cleaned === 'draft') return 'Draft';
    if (cleaned === 'submitted') return 'Submitted';
    if (cleaned === 'under review' || cleaned === 'under_review' || cleaned === 'under-review') return 'Under Review';
    if (cleaned === 'approved') return 'Approved';
    if (cleaned === 'rejected') return 'Rejected';
    return raw;
};

// Admin: get all delegations across all managers
// Only shows delegations that have been explicitly created and submitted by managers
export const getAllDelegations = async (): Promise<any[]> => {
    try {
        const adminDelegationEndpoints = ['/me/delegations', '/delegations/admin/all', '/admin/delegations'];
        let remoteDelegations: any[] = [];

        for (const endpoint of adminDelegationEndpoints) {
            try {
                console.log(`[API] Fetching delegations from ${endpoint}`);
                const { data } = await apiClient.get(endpoint);
                const result = Array.isArray(data) ? data : (data?.data || data?.delegations || []);
                if (Array.isArray(result)) {
                    remoteDelegations = result;
                    if (result.length > 0) break;
                }
            } catch (err: any) {
                if (err?.response?.status !== 404) {
                    console.warn(`[API] Delegations fetch failed for ${endpoint}:`, err?.message || err);
                }
            }
        }

        // Build delegation map from actual server delegations only
        const delegationMap = new Map<string, any>();

        for (const remote of remoteDelegations) {
            const remoteId = remote.id || remote._id;
            if (!remoteId || delegationMap.has(remoteId)) continue;

            const teamIds = remote.teamIds || remote.team_ids || (remote.teams || []).map((t: any) => t.id || t._id) || [];
            const status = normalizeDelegationStatus(remote.status);
            // Skip drafts that were never submitted
            if (status === 'Draft' && !remote.submittedAt && !remote.submitted_at) continue;

            delegationMap.set(remoteId, {
                ...remote,
                id: remoteId,
                delegationId: remote.delegationId || remote.delegation_id || remoteId,
                managerId: remote.managerId || remote.manager_id || remote.manager?.id || remote.user?.id || null,
                managerEmail: remote.managerEmail || remote.manager_email || remote.manager?.email || remote.user?.email || null,
                country: remote.country || remote.delegation?.country || 'Unknown',
                eventId: remote.eventId || remote.event_id || remote.event?.id || remote.event?._id || null,
                teamIds,
                totalMembers: remote.totalMembers || remote.total_members || remote.members?.length || 0,
                status,
                submittedAt: remote.submittedAt || remote.submitted_at,
                members: remote.members || [],
                teams: remote.teams || [],
                _sourceType: 'delegation',
                hasSubmittedRegistration: status !== 'Draft',
            });
        }

        // Now fetch registrations only to enrich existing delegations with member details
        try {
            console.log('[API] Fetching registrations to enrich delegation member data');
            const regsResponse = await apiClient.get('/registrations/admin/all');
            const registrations = Array.isArray(regsResponse.data) ? regsResponse.data : (regsResponse.data?.data || []);
            console.log('[API] Got registrations:', registrations.length);

            // Group teamIds by delegationId from registrations
            const delegationTeamsFromRegs = new Map<string, Set<string>>();
            for (const reg of registrations) {
                let regDelegationId = reg.delegationId || reg.delegation_id;
                if (!regDelegationId && reg.team) {
                    const teamDel = reg.team.delegationId || reg.team.delegation_id || reg.team.delegation;
                    regDelegationId = typeof teamDel === 'object' ? (teamDel.id || teamDel._id) : teamDel;
                }
                const regTeamId = reg.teamId || reg.team_id || (reg.team && typeof reg.team === 'object' ? (reg.team.id || reg.team._id) : reg.team);
                if (regDelegationId && regTeamId) {
                    if (!delegationTeamsFromRegs.has(regDelegationId)) {
                        delegationTeamsFromRegs.set(regDelegationId, new Set());
                    }
                    delegationTeamsFromRegs.get(regDelegationId)!.add(regTeamId);
                }
            }

            // Update delegations in map with teamIds from registrations
            for (const [remoteId, delegation] of delegationMap) {
                const regTeamIds = delegationTeamsFromRegs.get(remoteId);
                if (regTeamIds && (!delegation.teamIds || delegation.teamIds.length === 0)) {
                    delegation.teamIds = Array.from(regTeamIds);
                }
            }

            // Build a set of all teamIds that belong to known delegations
            const delegationTeamIds = new Set<string>();
            for (const [, delegation] of delegationMap) {
                for (const teamId of (delegation.teamIds || [])) {
                    delegationTeamIds.add(teamId);
                }
            }

            for (const reg of registrations) {
                let regDelegationId = reg.delegationId || reg.delegation_id;
                if (!regDelegationId && reg.team) {
                    const teamDel = reg.team.delegationId || reg.team.delegation_id || reg.team.delegation;
                    regDelegationId = typeof teamDel === 'object' ? (teamDel.id || teamDel._id) : teamDel;
                }
                const regTeamId = reg.teamId || reg.team_id || (reg.team && typeof reg.team === 'object' ? (reg.team.id || reg.team._id) : reg.team);

                // Only process registrations that belong to a known delegation
                // Match by delegationId directly, or by teamId belonging to a delegation's teams
                let matchedDelegationKey: string | null = null;

                if (regDelegationId && delegationMap.has(regDelegationId)) {
                    matchedDelegationKey = regDelegationId;
                } else if (regTeamId && delegationTeamIds.has(regTeamId)) {
                    // Find which delegation owns this teamId
                    for (const [key, delegation] of delegationMap) {
                        if ((delegation.teamIds || []).includes(regTeamId)) {
                            matchedDelegationKey = key;
                            break;
                        }
                    }
                }

                // Skip registrations that don't belong to any known delegation
                if (!matchedDelegationKey) continue;

                const existing = delegationMap.get(matchedDelegationKey)!;
                const memberObj = {
                    ...(reg.participant || reg),
                    teamId: regTeamId,
                    team_id: regTeamId,
                    registrationId: reg.id || reg._id || reg.registrationId || reg.registration_id,
                };

                // Avoid duplicate members
                const alreadyExists = existing.members.some((m: any) => {
                    const mEmail = m.email || m.participant?.email;
                    const newEmail = memberObj.email || memberObj.participant?.email;
                    return mEmail && newEmail && mEmail.toLowerCase() === newEmail.toLowerCase();
                });

                if (!alreadyExists) {
                    existing.members.push(memberObj);
                    existing.totalMembers = existing.members.length;
                }

                const regManagerId = reg.managerId || reg.manager_id || reg.team?.managerId || reg.team?.manager_id;
                const regManagerEmail = reg.managerEmail || reg.manager_email || reg.team?.managerEmail || reg.team?.manager?.email;
                if (!existing.managerId && regManagerId) {
                    existing.managerId = regManagerId;
                }
                if (!existing.managerEmail && regManagerEmail) {
                    existing.managerEmail = regManagerEmail;
                }
            }
        } catch (regErr: any) {
            console.warn('[API] Failed to fetch registrations for enrichment:', regErr?.message);
        }

        const combinedDelegations = Array.from(delegationMap.values());
        console.log('[API] Returning delegations:', combinedDelegations.length);
        return combinedDelegations;
    } catch (err: any) {
        console.error('[API] Error fetching delegations:', err);
        return [];
    }
};

// Admin: approve or reject a delegation
export const updateDelegationStatus = async (id: string, status: 'Approved' | 'Rejected', reason?: string, _snapshot?: any): Promise<any> => {
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

export const deleteDelegation = async (id: string): Promise<void> => {
    await apiClient.delete(`/delegations/${id}`);
};

export const extractDelegationId = (delegation: unknown): string => {
    const record = delegation as Record<string, unknown> | null | undefined;
    if (!record) return '';

    const nested =
        record.data && typeof record.data === 'object'
            ? (record.data as Record<string, unknown>)
            : null;
    const source = nested || record;

    return String(
        source.id ||
        source._id ||
        source.delegationId ||
        source.delegation_id ||
        '',
    );
};
