import apiClient from './apiClient';
import { Team, TeamMember } from '@/lib/teamStore';

export interface CreateTeamPayload {
    delegationId?: string;
    eventId?: string;
    name: string;
    sportCategoryGroup: string;
    subCategory: string;
    expectedTeamIndex?: number;
}

export const createTeam = async (payload: CreateTeamPayload): Promise<Team> => {
    const body = {
        ...(payload.delegationId ? { delegationId: payload.delegationId } : {}),
        ...(payload.eventId ? { eventId: payload.eventId } : {}),
        name: payload.name,
        sportCategoryGroup: payload.sportCategoryGroup,
        subCategory: payload.subCategory,
        ...(payload.expectedTeamIndex !== undefined ? { expectedTeamIndex: payload.expectedTeamIndex } : {}),
    };

    const { data } = await apiClient.post('/teams', body);
    const result = data?.data || data?.team || data;
    return {
        ...result,
        id: result?.id || result?._id,
    } as Team;
};

export const getMyTeams = async (): Promise<Team[]> => {
    const endpoints = ['/me/teams', '/teams/me', '/teams'];
    for (const endpoint of endpoints) {
        try {
            const { data } = await apiClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.teams || []);
            if (Array.isArray(result) && result.length > 0) return result;
            // If empty but succeeded, maybe this is the right endpoint but just empty
            if (Array.isArray(result)) return result;
        } catch (err: any) {
            if (err?.response?.status !== 404 && err?.response?.status !== 403 && err?.response?.status !== 400) {
                console.error(`Error fetching from ${endpoint}:`, err);
            }
        }
    }
    return [];
};

export const getAllTeams = async (): Promise<Team[]> => {
    try {
        const { data } = await apiClient.get('/admin/teams');
        const teams = Array.isArray(data) ? data : (data?.data || data?.teams || []);
        if (Array.isArray(teams)) {
            return teams.map((team: any) => ({
                ...team,
                id: team.id || team._id,
                delegationId: team.delegationId || team.delegation_id || team.delegation?.id,
                eventId: team.eventId || team.event_id || team.event?.id,
            })) as Team[];
        }
    } catch (err: any) {
        console.error('[API] Error fetching teams:', {
            status: err?.response?.status,
            message: err?.message
        });
    }

    try {
        // Legacy fallback for older backends that do not expose /admin/teams.
        const regsResponse = await apiClient.get('/registrations/admin/all');
        const registrations = Array.isArray(regsResponse.data) ? regsResponse.data : (regsResponse.data?.data || []);
        // Extract unique teams from registrations
        const teamMap = new Map<string, Team>();
        for (const reg of registrations) {
            const teamId = reg.teamId || reg.team_id;
            let delegationId = reg.delegationId || reg.delegation_id;
            if (!delegationId && reg.team) {
                const teamDel = reg.team.delegationId || reg.team.delegation_id || reg.team.delegation;
                delegationId = typeof teamDel === 'object' ? (teamDel.id || teamDel._id) : teamDel;
            }
            if (teamId && !teamMap.has(teamId)) {
                teamMap.set(teamId, {
                    id: teamId,
                    // delegationId,
                    managerId: reg.managerId || reg.manager_id || 'unknown',
                    name: reg.team?.name || `Team ${teamId.substring(0, 8)}`,
                    country: reg.country || 'Unknown',
                    sportCategory: reg.sportCategory || reg.sport_category || 'Unknown',
                    subCategory: reg.subCategory || reg.sub_category || '',
                    eventId: reg.eventId || reg.event_id || '',
                    memberCount: 1,
                    status: reg.status || 'Submitted',
                    createdAt: reg.createdAt || new Date().toISOString(),
                    updatedAt: reg.updatedAt || new Date().toISOString(),
                    _sourceType: 'registration'
                });
            } else if (teamId && teamMap.has(teamId)) {
                const existing = teamMap.get(teamId)!;
                existing.memberCount = (existing.memberCount || 0) + 1;
                if (delegationId && !existing.delegationId) {
                    existing.delegationId = delegationId;
                }
            }
        }

        const teams = Array.from(teamMap.values());
        return teams;
    } catch (err: any) {
        return [];
    }
};

export const getTeamById = async (id: string): Promise<Team> => {
    const { data } = await apiClient.get(`/teams/${id}`);
    return data;
};

export const updateTeam = async (id: string, payload: Partial<Team>): Promise<Team> => {
    const { data } = await apiClient.patch(`/teams/${id}`, payload);
    return data;
};

export const deleteTeam = async (id: string): Promise<void> => {
    await apiClient.delete(`/teams/${id}`);
};

export const addTeamMember = async (teamId: string, payload: any): Promise<TeamMember> => {
    const { data } = await apiClient.post(`/teams/${teamId}/members`, payload);
    return data;
};

export const listTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
    const { data } = await apiClient.get(`/teams/${teamId}/members`);
    return Array.isArray(data) ? data : (data?.data || data?.members || []);
};

export const updateTeamMember = async (membershipId: string, payload: any): Promise<TeamMember> => {
    const { data } = await apiClient.patch(`/team-members/${membershipId}`, payload);
    return data?.data || data;
};

export const deleteTeamMember = async (membershipId: string): Promise<void> => {
    await apiClient.delete(`/team-members/${membershipId}`);
};

/** Team-membership record id for DELETE /team-members/{id} (not participant id). */
export const resolveTeamMembershipId = (raw: any): string =>
    String(
        raw?.membershipId ||
        raw?.membership_id ||
        raw?.teamMemberId ||
        raw?.team_member_id ||
        raw?.id ||
        raw?._id ||
        '',
    );

export const syncTeamMemberCount = async (teamId: string): Promise<number> => {
    const members = await listTeamMembers(teamId);
    const count = members.length;
    try {
        await updateTeam(teamId, { memberCount: count });
    } catch {
        // Backend may not accept memberCount on PATCH — count is still returned for UI.
    }
    return count;
};

export const addTeamMembersBulk = async (teamId: string, members: any[]): Promise<any> => {
    const results = [];
    for (const member of members) {
        const created = await addTeamMember(teamId, member);
        results.push(created);
    }
    return results;
};

export interface PendingTeamMember {
    id: string;
    role?: string;
    status?: string;
    participant: { id: string; firstName?: string; lastName?: string; email?: string; nationality?: string } | null;
    team: { id: string; name?: string } | null;
    delegation: { id: string; country?: string; managerName?: string | null } | null;
    eventName?: string | null;
}

// Admin: list team members whose manager has sent the roster for review
export const getPendingTeamMembers = async (): Promise<PendingTeamMember[]> => {
    const { data } = await apiClient.get('/team-members/pending');
    return Array.isArray(data) ? data : (data?.data || []);
};

// Admin: approve a single team member (delegates to the standard registration approval)
export const approveTeamMember = async (memberId: string): Promise<any> => {
    const { data } = await apiClient.post(`/team-members/${memberId}/approve`);
    return data;
};

// Admin: reject a single team member with a reason
export const rejectTeamMember = async (memberId: string, reason: string): Promise<any> => {
    const { data } = await apiClient.post(`/team-members/${memberId}/reject`, { reason });
    return data;
};
