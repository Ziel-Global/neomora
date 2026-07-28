import apiClient from './apiClient';

export interface AdminDashboardStats {
  invited: number;
  rsvpYes: number;
  rsvpNo: number;
  rsvpMaybe: number;
  rsvpPending: number;
  regTotal: number;
  regApproved: number;
  regPending: number;
  regUnderReview: number;
  regRejected: number;
  visaApproved: number;
  visaPending: number;
  travelTicketed: number;
  travelPending: number;
  accomAllocated: number;
  badgesPrinted: number;
  badgesReady: number;
  badgesPending: number;
  totalEvents: number;
  totalParticipants: number;
  totalDelegations: number;
  totalTeams: number;
  totalCampaigns: number;
  pendingInvitations: number;
}

export interface AdminDashboardAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  link?: string;
}

export interface AdminDashboardActivity {
  action: string;
  participant: string;
  time: string;
}

export interface AdminDashboardData {
  eventName?: string;
  eventId?: string;
  generatedAt?: string;
  stats: AdminDashboardStats;
  alerts: AdminDashboardAlert[];
  recentActivity: AdminDashboardActivity[];
}

const pickNumber = (...values: unknown[]): number => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
};

const unwrapDashboardPayload = (data: unknown): Record<string, unknown> => {
  if (!data || typeof data !== 'object') return {};
  const root = data as Record<string, unknown>;
  const nested = root.data ?? root.dashboard ?? root.result ?? root.payload;
  if (nested && typeof nested === 'object') {
    return nested as Record<string, unknown>;
  }
  return root;
};

const section = (raw: Record<string, unknown>, ...keys: string[]): Record<string, unknown> => {
  for (const key of keys) {
    const value = raw[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
};

const collectStatSources = (raw: Record<string, unknown>): Record<string, unknown>[] => {
  const sources: Record<string, unknown>[] = [raw];
  const nestedKeys = ['stats', 'summary', 'counts', 'metrics', 'overview', 'kpis', 'dashboard', 'data'];

  for (const key of nestedKeys) {
    const value = raw[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sources.push(value as Record<string, unknown>);
    }
  }

  return sources;
};

const pickFromSources = (sources: Record<string, unknown>[], ...keys: string[]): number => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined || value === '') continue;
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
};

const normalizeStatusKey = (key: string): string => key.trim().toLowerCase().replace(/_/g, ' ');

const pickFromStatusObject = (obj: Record<string, unknown>, ...statuses: string[]): number => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0;
  const wanted = new Set(statuses.map(normalizeStatusKey));

  return Object.entries(obj).reduce((sum, [key, value]) => {
    if (!wanted.has(normalizeStatusKey(key))) return sum;
    return sum + pickNumber(value);
  }, 0);
};

const sumStatusCounts = (list: unknown, ...statuses: string[]): number => {
  if (Array.isArray(list)) {
    const wanted = new Set(statuses.map(status => status.toLowerCase()));

    return list.reduce((sum, item) => {
      const entry = item as Record<string, unknown>;
      const status = String(entry?.status || entry?.name || entry?.label || entry?.key || '').trim().toLowerCase();
      if (!wanted.has(status)) return sum;
      return sum + pickNumber(entry?.count, entry?.value, entry?.total, entry?.amount);
    }, 0);
  }

  if (list && typeof list === 'object') {
    return pickFromStatusObject(list as Record<string, unknown>, ...statuses);
  }

  return 0;
};

const sectionFromSources = (sources: Record<string, unknown>[], ...keys: string[]): Record<string, unknown> => {
  for (const source of sources) {
    const result = section(source, ...keys);
    if (Object.keys(result).length > 0) return result;
  }
  return {};
};

const pickEventScopedPayload = (
  raw: Record<string, unknown>,
  eventId?: string,
): Record<string, unknown> => {
  if (!eventId) return raw;

  const eventLists = [
    raw.events,
    raw.eventStats,
    raw.event_stats,
    raw.byEvent,
    raw.by_event,
    raw.eventDashboards,
    raw.event_dashboards,
  ];

  for (const list of eventLists) {
    if (!Array.isArray(list)) continue;

    const match = list.find(item => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Record<string, unknown>;
      const nestedEvent = entry.event && typeof entry.event === 'object'
        ? (entry.event as Record<string, unknown>)
        : undefined;
      const id = entry.eventId || entry.event_id || entry.id || nestedEvent?.id || nestedEvent?._id;
      return String(id) === String(eventId);
    });

    if (match && typeof match === 'object') {
      const entry = match as Record<string, unknown>;
      const nestedEvent = entry.event && typeof entry.event === 'object'
        ? (entry.event as Record<string, unknown>)
        : undefined;

      return {
        ...raw,
        ...entry,
        event: nestedEvent ?? { id: eventId, name: entry.eventName ?? entry.event_name ?? entry.name },
        eventId,
      };
    }
  }

  return {
    ...raw,
    eventId: raw.eventId ?? raw.event_id ?? eventId,
    event: raw.event ?? { id: eventId },
  };
};

const normalizeAlertType = (value: unknown): AdminDashboardAlert['type'] => {
  const normalized = String(value || 'info').trim().toLowerCase();
  if (normalized === 'error' || normalized === 'danger' || normalized === 'critical') return 'error';
  if (normalized === 'warning' || normalized === 'warn') return 'warning';
  return 'info';
};

const formatActivityTime = (value: unknown): string => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const normalizeAlerts = (raw: Record<string, unknown>): AdminDashboardAlert[] => {
  const list = raw.alerts ?? raw.notifications ?? raw.alertItems ?? raw.alert_items;
  if (!Array.isArray(list)) return [];

  return list
    .map((item: any) => ({
      type: normalizeAlertType(item?.type ?? item?.severity ?? item?.level),
      message: String(item?.message ?? item?.text ?? item?.title ?? '').trim(),
      link: item?.link ?? item?.href ?? item?.url ? String(item.link ?? item.href ?? item.url) : undefined,
    }))
    .filter(alert => alert.message);
};

const normalizeRecentActivity = (
  raw: Record<string, unknown>,
  eventId?: string,
): AdminDashboardActivity[] => {
  const list = raw.recentActivity ?? raw.recent_activity ?? raw.activities ?? raw.activity ?? raw.recentActivities;
  if (!Array.isArray(list)) return [];

  return list
    .filter((item: any) => {
      if (!eventId) return true;
      const itemEventId =
        item?.eventId ||
        item?.event_id ||
        item?.event?.id ||
        item?.event?._id;
      return !itemEventId || String(itemEventId) === String(eventId);
    })
    .map((item: any) => ({
      action: String(item?.action ?? item?.description ?? item?.event ?? item?.title ?? 'Activity').trim(),
      participant: String(
        item?.participant ??
        item?.participantName ??
        item?.participant_name ??
        item?.userName ??
        item?.user_name ??
        item?.name ??
        '',
      ).trim(),
      time: formatActivityTime(item?.time ?? item?.timestamp ?? item?.createdAt ?? item?.created_at),
    }))
    .filter(item => item.action);
};

export const normalizeAdminDashboard = (data: unknown, eventId?: string): AdminDashboardData => {
  const unwrapped = unwrapDashboardPayload(data);
  const raw = pickEventScopedPayload(unwrapped, eventId);
  const sources = collectStatSources(raw);
  const source = { ...raw, ...sources.reduce((acc, entry) => ({ ...acc, ...entry }), {}) };

  const registrations = sectionFromSources(sources, 'registrations', 'registration', 'registrationStats', 'registration_stats');
  const rsvp = sectionFromSources(sources, 'rsvp', 'rsvps', 'invitationsRsvp', 'rsvpStats', 'rsvp_stats', 'responses', 'responseStats', 'response_stats');
  const visas = sectionFromSources(sources, 'visas', 'visa');
  const travel = sectionFromSources(sources, 'travel', 'travelBookings', 'travel_bookings');
  const accommodation = sectionFromSources(sources, 'accommodation', 'accommodations', 'hotels');
  const badges = sectionFromSources(sources, 'badges', 'accreditation', 'accreditations');
  const invitations = sectionFromSources(sources, 'invitations', 'invitation', 'invitationStats', 'invitation_stats');

  const registrationStatusCounts =
    source.registrationStatusCounts ??
    source.registration_status_counts ??
    registrations.byStatus ??
    registrations.statusCounts ??
    registrations.status_counts ??
    registrations.breakdown;

  const invitationStatusCounts =
    source.invitationStatusCounts ??
    source.invitation_status_counts ??
    invitations.byStatus ??
    invitations.statusCounts ??
    invitations.status_counts ??
    invitations.breakdown;

  const regApproved =
    pickFromSources(
      sources,
      'regApproved',
      'registrationsApproved',
      'approvedRegistrations',
      'approved_registrations',
      'registrations_approved',
    ) ||
    pickNumber(registrations.approved, registrations.Approved, registrations.approvedCount, registrations.approved_count) ||
    pickFromStatusObject(registrations as Record<string, unknown>, 'approved') ||
    sumStatusCounts(registrationStatusCounts, 'approved');

  const regUnderReview =
    pickFromSources(
      sources,
      'regUnderReview',
      'registrationsUnderReview',
      'underReviewRegistrations',
      'registrations_under_review',
      'under_review_registrations',
    ) ||
    pickNumber(
      registrations.underReview,
      registrations.under_review,
      registrations['Under Review'],
      registrations.inReview,
      registrations.in_review,
    ) ||
    pickFromStatusObject(registrations as Record<string, unknown>, 'under review', 'in review', 'review') ||
    sumStatusCounts(registrationStatusCounts, 'under review', 'in review', 'review');

  const regSubmitted =
    pickNumber(registrations.submitted, registrations.Submitted, registrations.submittedCount, registrations.submitted_count) ||
    sumStatusCounts(registrationStatusCounts, 'submitted');

  const regPendingRaw =
    pickFromSources(
      sources,
      'regPending',
      'pendingRegistrations',
      'registrationsPending',
      'pending_registrations',
      'registrations_pending',
    ) ||
    pickNumber(registrations.pending, registrations.Pending, registrations.pendingCount, registrations.pending_count) ||
    sumStatusCounts(registrationStatusCounts, 'pending');

  const regPending = regUnderReview || regSubmitted || regPendingRaw;

  const regRejected =
    pickFromSources(sources, 'regRejected', 'rejectedRegistrations', 'registrationsRejected') ||
    pickNumber(registrations.rejected, registrations.Rejected, registrations.rejectedCount, registrations.rejected_count) ||
    sumStatusCounts(registrationStatusCounts, 'rejected', 'declined');

  const regTotal =
    pickFromSources(
      sources,
      'regTotal',
      'totalRegistrations',
      'registrationsTotal',
      'total_registrations',
      'registrations_total',
      'registrationCount',
      'registration_count',
      'registered',
      'totalRegistered',
      'total_registered',
    ) ||
    pickNumber(registrations.total, registrations.count, registrations.totalCount, registrations.total_count) ||
    pickFromStatusObject(registrations as Record<string, unknown>, 'total', 'all', 'registered') ||
    (regApproved + regPending + regRejected > 0 ? regApproved + regPending + regRejected : 0);

  const rsvpYes =
    pickFromSources(
      sources,
      'rsvpYes',
      'rsvp_yes',
      'rsvpConfirmed',
      'rsvp_confirmed',
      'confirmedRsvp',
      'confirmed_rsvp',
      'acceptedRsvp',
      'accepted_rsvp',
      'acceptedInvitations',
      'accepted_invitations',
      'rsvpConfirmedCount',
      'rsvp_confirmed_count',
    ) ||
    pickNumber(
      rsvp.yes,
      rsvp.confirmed,
      rsvp.accepted,
      rsvp.acceptedCount,
      rsvp.accepted_count,
      invitations.accepted,
      invitations.rsvpConfirmed,
      invitations.rsvp_confirmed,
      invitations.confirmed,
    ) ||
    pickFromStatusObject(rsvp as Record<string, unknown>, 'accepted', 'yes', 'confirmed') ||
    pickFromStatusObject(invitations as Record<string, unknown>, 'accepted', 'yes', 'confirmed') ||
    sumStatusCounts(invitationStatusCounts, 'accepted', 'confirmed', 'yes');

  const event =
    (raw.event && typeof raw.event === 'object' ? raw.event : null) ??
    (raw.currentEvent && typeof raw.currentEvent === 'object' ? raw.currentEvent : null);

  const stats: AdminDashboardStats = {
    invited: pickFromSources(
      sources,
      'invited',
      'totalInvited',
      'total_invited',
      'participantsInvited',
      'participants_invited',
    ) || pickNumber(
      source.invited,
      invitations.total,
      invitations.sent,
      invitations.totalSent,
      invitations.total_sent,
    ),
    rsvpYes,
    rsvpNo:
      pickFromSources(sources, 'rsvpNo', 'rsvp_no', 'declinedRsvp', 'declined_rsvp') ||
      pickNumber(rsvp.no, rsvp.declined, rsvp.rejected, invitations.declined) ||
      sumStatusCounts(invitationStatusCounts, 'declined', 'rejected', 'no'),
    rsvpMaybe:
      pickFromSources(sources, 'rsvpMaybe', 'rsvp_maybe', 'maybeRsvp', 'maybe_rsvp') ||
      pickNumber(rsvp.maybe, invitations.maybe) ||
      sumStatusCounts(invitationStatusCounts, 'maybe'),
    rsvpPending:
      pickFromSources(sources, 'rsvpPending', 'rsvp_pending', 'pendingRsvp', 'pending_rsvp') ||
      pickNumber(rsvp.pending, rsvp.invited, rsvp.awaiting, invitations.pending, invitations.sent) ||
      sumStatusCounts(invitationStatusCounts, 'pending', 'sent', 'delivered', 'opened', 'invited'),
    regTotal,
    regApproved,
    regPending,
    regUnderReview: regUnderReview || regPending,
    regRejected,
    visaApproved: pickNumber(visas.approved, visas.Approved, source.visaApproved),
    visaPending: pickNumber(visas.pending, visas.inProcess, visas.in_process, source.visaPending),
    travelTicketed: pickNumber(travel.ticketed, travel.booked, travel.confirmed, source.travelTicketed),
    travelPending: pickNumber(travel.pending, travel.requested, source.travelPending),
    accomAllocated: pickNumber(
      accommodation.allocated,
      accommodation.confirmed,
      accommodation.booked,
      source.accomAllocated,
      source.roomsAllocated,
    ),
    badgesPrinted: pickNumber(badges.printed, badges.completed, source.badgesPrinted),
    badgesReady: pickNumber(badges.ready, badges.prepared, source.badgesReady),
    badgesPending: pickNumber(badges.pending, source.badgesPending),
    totalEvents: pickNumber(source.totalEvents, source.events, source.eventCount, source.total_events),
    totalParticipants: pickNumber(
      source.totalParticipants,
      source.participants,
      source.participantCount,
      source.total_participants,
    ),
    totalDelegations: pickNumber(source.totalDelegations, source.delegations, source.total_delegations),
    totalTeams: pickNumber(source.totalTeams, source.teams, source.total_teams),
    totalCampaigns: pickNumber(source.totalCampaigns, source.campaigns, source.total_campaigns),
    pendingInvitations: pickNumber(
      invitations.pending,
      source.pendingInvitations,
      source.pending_invitations,
    ),
  };

  return {
    eventName: String(
      (event as any)?.name ??
      raw.eventName ??
      raw.event_name ??
      raw.currentEventName ??
      '',
    ).trim() || undefined,
    eventId: String((event as any)?.id ?? raw.eventId ?? raw.event_id ?? eventId ?? '').trim() || undefined,
    generatedAt: String(raw.generatedAt ?? raw.generated_at ?? raw.updatedAt ?? raw.updated_at ?? '').trim() || undefined,
    stats,
    alerts: normalizeAlerts(raw),
    recentActivity: normalizeRecentActivity(raw, eventId),
  };
};

export const getAdminDashboard = async (eventId?: string): Promise<AdminDashboardData> => {
  const params = eventId ? { eventId, event_id: eventId } : undefined;
  const { data } = await apiClient.get('/admin/dashboard', { params });
  return normalizeAdminDashboard(data, eventId);
};

export interface ManagerDashboardTeam {
  id: string;
  name: string;
  sportCategory?: string;
  memberCount: number;
  status: string;
  eventId?: string;
  eventName?: string;
}

export interface ManagerDashboardEvent {
  id: string;
  name: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ManagerDashboardDelegation {
  id: string;
  name?: string;
  status: string;
  eventId?: string;
  eventName?: string;
  teamCount?: number;
}

export interface ManagerDashboardStats {
  totalTeams: number;
  totalMembers: number;
  totalDelegations: number;
  pendingApproval: number;
  pendingRegistrations: number;
  pendingInvitations: number;
  approvedTeams: number;
}

export interface ManagerDashboardData {
  managerName?: string;
  country?: string;
  organization?: string;
  generatedAt?: string;
  stats: ManagerDashboardStats;
  teams: ManagerDashboardTeam[];
  delegations: ManagerDashboardDelegation[];
  events: ManagerDashboardEvent[];
  alerts: AdminDashboardAlert[];
  recentActivity: AdminDashboardActivity[];
}

const unwrapList = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
};

const normalizeManagerTeam = (raw: any): ManagerDashboardTeam | null => {
  const id = raw?.id || raw?._id;
  if (!id) return null;

  const event = raw?.event && typeof raw.event === 'object' ? raw.event : undefined;
  const sportCategory =
    raw?.sportCategory ||
    raw?.sport_category ||
    raw?.sportCategoryGroup ||
    raw?.sport_category_group ||
    '';

  return {
    id: String(id),
    name: String(raw?.name || 'Unnamed team'),
    sportCategory: sportCategory ? String(sportCategory) : undefined,
    memberCount: pickNumber(raw?.memberCount, raw?.member_count, raw?.membersCount, raw?.members?.length),
    status: String(raw?.status || 'Draft'),
    eventId: String(raw?.eventId || raw?.event_id || event?.id || '').trim() || undefined,
    eventName: String(event?.name || raw?.eventName || raw?.event_name || '').trim() || undefined,
  };
};

const normalizeManagerEvent = (raw: any): ManagerDashboardEvent | null => {
  const id = raw?.id || raw?._id;
  if (!id) return null;

  return {
    id: String(id),
    name: String(raw?.name || 'Event'),
    city: raw?.city ? String(raw.city) : undefined,
    startDate: raw?.startDate || raw?.start_date ? String(raw.startDate || raw.start_date) : undefined,
    endDate: raw?.endDate || raw?.end_date ? String(raw.endDate || raw.end_date) : undefined,
    status: raw?.status ? String(raw.status) : undefined,
  };
};

const normalizeManagerDelegation = (raw: any): ManagerDashboardDelegation | null => {
  const id = raw?.id || raw?._id;
  if (!id) return null;

  const event = raw?.event && typeof raw.event === 'object' ? raw.event : undefined;

  return {
    id: String(id),
    name: String(raw?.name || raw?.country || raw?.organization || '').trim() || undefined,
    status: String(raw?.status || 'Draft'),
    eventId: String(raw?.eventId || raw?.event_id || event?.id || '').trim() || undefined,
    eventName: String(event?.name || raw?.eventName || raw?.event_name || '').trim() || undefined,
    teamCount: pickNumber(raw?.teamCount, raw?.team_count, raw?.teamsCount, raw?.teams?.length),
  };
};

export const normalizeManagerDashboard = (data: unknown): ManagerDashboardData => {
  const raw = unwrapDashboardPayload(data);
  const statsRoot = section(raw, 'stats', 'summary', 'counts', 'metrics', 'overview');
  const source = Object.keys(statsRoot).length > 0 ? { ...raw, ...statsRoot } : raw;

  const teams = unwrapList(raw.teams ?? source.teams ?? raw.myTeams ?? source.my_teams)
    .map(normalizeManagerTeam)
    .filter(Boolean) as ManagerDashboardTeam[];

  const delegations = unwrapList(raw.delegations ?? source.delegations ?? raw.myDelegations ?? source.my_delegations)
    .map(normalizeManagerDelegation)
    .filter(Boolean) as ManagerDashboardDelegation[];

  const events = unwrapList(raw.events ?? source.events ?? raw.availableEvents ?? source.available_events)
    .map(normalizeManagerEvent)
    .filter(Boolean) as ManagerDashboardEvent[];

  const pendingApprovalFromTeams = teams.filter(team =>
    ['Submitted', 'Under Review', 'Pending', 'Pending Approval'].includes(team.status),
  ).length;

  const stats: ManagerDashboardStats = {
    totalTeams: pickNumber(source.totalTeams, source.teams, source.teamCount, source.total_teams, teams.length),
    totalMembers: pickNumber(
      source.totalMembers,
      source.members,
      source.memberCount,
      source.total_members,
      source.participants,
    ),
    totalDelegations: pickNumber(
      source.totalDelegations,
      source.delegations,
      source.delegationCount,
      source.total_delegations,
      delegations.length,
    ),
    pendingApproval: pickNumber(
      source.pendingApproval,
      source.pendingTeams,
      source.pending_approval,
      source.pending_teams,
      pendingApprovalFromTeams,
    ),
    pendingRegistrations: pickNumber(
      source.pendingRegistrations,
      source.pending_registrations,
      source.registrationsPending,
    ),
    pendingInvitations: pickNumber(
      source.pendingInvitations,
      source.pending_invitations,
      source.invitationsPending,
    ),
    approvedTeams: pickNumber(
      source.approvedTeams,
      source.approved_teams,
      teams.filter(team => team.status === 'Approved').length,
    ),
  };

  if (stats.totalMembers === 0 && teams.length > 0) {
    stats.totalMembers = teams.reduce((sum, team) => sum + team.memberCount, 0);
  }

  const manager =
    (raw.manager && typeof raw.manager === 'object' ? raw.manager : null) ??
    (raw.user && typeof raw.user === 'object' ? raw.user : null);

  return {
    managerName: String(
      (manager as any)?.firstName ??
      (manager as any)?.name ??
      raw.managerName ??
      raw.manager_name ??
      '',
    ).trim() || undefined,
    country: String(
      (manager as any)?.country ??
      raw.country ??
      raw.delegationCountry ??
      '',
    ).trim() || undefined,
    organization: String((manager as any)?.organization ?? raw.organization ?? '').trim() || undefined,
    generatedAt: String(raw.generatedAt ?? raw.generated_at ?? raw.updatedAt ?? raw.updated_at ?? '').trim() || undefined,
    stats,
    teams,
    delegations,
    events,
    alerts: normalizeAlerts(raw),
    recentActivity: normalizeRecentActivity(raw),
  };
};

export const getManagerDashboard = async (): Promise<ManagerDashboardData> => {
  const { data } = await apiClient.get('/me/dashboard');
  return normalizeManagerDashboard(data);
};
