/** Business rule: each delegation may have at most one team. */

export const MAX_TEAMS_PER_DELEGATION = 1;

export const getTeamDelegationId = (team: {
  delegationId?: string;
  delegation_id?: string;
  delegation?: { id?: string; _id?: string } | string;
} | null | undefined): string => {
  if (!team) return '';
  const raw = team.delegationId || team.delegation_id || team.delegation;
  if (!raw) return '';
  if (typeof raw === 'object') return String(raw.id || raw._id || '');
  return String(raw);
};

export const getDelegationTeamIds = (delegation: {
  id?: string;
  _id?: string;
  teamIds?: string[];
  team_ids?: string[];
  teams?: Array<{ id?: string; _id?: string }>;
} | null | undefined): string[] => {
  if (!delegation) return [];
  const explicit =
    delegation.teamIds ||
    delegation.team_ids ||
    (delegation.teams || []).map(t => t.id || t._id).filter(Boolean);
  return [...new Set((explicit || []).map(String).filter(Boolean))];
};

export const countTeamsForDelegation = (
  delegationId: string,
  teams: Array<{ id?: string; _id?: string; delegationId?: string; delegation_id?: string; delegation?: unknown }>,
  delegation?: { teamIds?: string[]; team_ids?: string[]; teams?: Array<{ id?: string; _id?: string }> },
): number => {
  const id = String(delegationId);
  if (!id) return 0;

  const linkedTeamIds = new Set<string>();

  for (const team of teams) {
    if (getTeamDelegationId(team) === id) {
      const teamId = String(team.id || team._id || '');
      if (teamId) linkedTeamIds.add(teamId);
    }
  }

  for (const teamId of getDelegationTeamIds(delegation)) {
    linkedTeamIds.add(String(teamId));
  }

  return linkedTeamIds.size;
};

export const delegationHasTeam = (
  delegationId: string,
  teams: Parameters<typeof countTeamsForDelegation>[1],
  delegation?: Parameters<typeof countTeamsForDelegation>[2],
): boolean => countTeamsForDelegation(delegationId, teams, delegation) >= MAX_TEAMS_PER_DELEGATION;

export const isTeamUnassigned = (team: Parameters<typeof getTeamDelegationId>[0]): boolean =>
  !getTeamDelegationId(team);
