import apiClient from './apiClient';
import axios from 'axios';
import {
    hasParticipantToken,
    isEndpointBlocked,
    markEndpointBlocked,
    orderEndpoints,
    setCachedEndpoint,
} from './endpointCache';

export interface CampaignInvitationStats {
    totalInvitations: number;
    deliveries: {
        delivered: number;
        opened: number;
    };
    rsvp: {
        accepted: number;
        declined: number;
        maybe: number;
        pending: number;
    };
}

export interface CampaignStatsView {
    totalInvitations: number;
    delivered: number;
    opened: number;
    accepted: number;
    maybe: number;
    declined: number;
    pending: number;
    audienceSize: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    acceptedCount: number;
    maybeCount: number;
    declinedCount: number;
}

export interface Campaign {
    id: string;
    name: string;
    subject: string;
    content: string;
    status: 'Draft' | 'Sent' | 'Scheduled';
    scheduledAt?: string;
    sentAt?: string;
    eventId: string;
    templateId?: string;
    targetRoles?: string[];
    targetNationalities?: string[] | null;
    targetDelegationIds?: string[] | null;
    targetManagerIds?: string[] | null;
    rsvpDeadline?: string;
    audienceIds?: string[];
    targetParticipantIds?: string[];
    audienceSize?: number | null;
    invitationStats?: CampaignInvitationStats;
    stats?: {
        audienceSize?: number | null;
        sentCount?: number | null;
        deliveredCount?: number | null;
        openedCount?: number | null;
        acceptedCount?: number | null;
        maybeCount?: number | null;
        declinedCount?: number | null;
    };
    event?: {
        id: string;
        name?: string;
    };
    template?: {
        id: string;
        name?: string;
        subject?: string;
        body?: string;
    };
    createdAt: string;
    updatedAt: string;
}

const managerCampaignClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

managerCampaignClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('ems_manager_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const participantCampaignClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

participantCampaignClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('ems_participant_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface CreateCampaignPayload {
    name: string;
    subject: string;
    content: string;
    eventId: string;
    templateId?: string;
    targetRoles?: string[];
    targetNationalities?: string[];
    targetDelegationIds?: string[];
    targetManagerIds?: string[];
    audienceSize?: number;
    rsvpDeadline: string;
    audienceIds?: string[];
    targetParticipantIds?: string[];
    // invitationIds?: string[];
    roleFilters?: string[];
}

const normalizeDelegationIds = (raw: any): string[] => {
    const normalizeValue = (value: unknown): string[] => {
        if (Array.isArray(value)) {
            return value.map(String).filter(Boolean);
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return [];
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [trimmed];
                } catch {
                    return [trimmed];
                }
            }
            return [trimmed];
        }
        return [];
    };

    if (raw?.targetDelegationIds !== undefined) {
        const ids = normalizeValue(raw.targetDelegationIds);
        if (ids.length > 0) return ids;
    }
    if (raw?.target_delegation_ids !== undefined) {
        const ids = normalizeValue(raw.target_delegation_ids);
        if (ids.length > 0) return ids;
    }
    const singular = raw?.targetDelegationId || raw?.target_delegation_id;
    return singular ? [String(singular)] : [];
};

const normalizeManagerIds = (raw: any): string[] => {
    if (Array.isArray(raw?.targetManagerIds)) {
        return raw.targetManagerIds.map(String).filter(Boolean);
    }
    if (Array.isArray(raw?.target_manager_ids)) {
        return raw.target_manager_ids.map(String).filter(Boolean);
    }
    const singular = raw?.targetManagerId || raw?.target_manager_id;
    return singular ? [String(singular)] : [];
};

export const getCampaignDelegationIds = (campaign: Campaign | any): string[] =>
    normalizeDelegationIds(campaign);

export const campaignTargetsDelegation = (campaign: Campaign, delegationIds: string[]): boolean => {
    const targets = getCampaignDelegationIds(campaign);
    if (!targets.length || !delegationIds.length) return false;
    const delegationSet = new Set(delegationIds.map(String));
    return targets.some(id => delegationSet.has(String(id)));
};

export const getCampaignManagerRoleIds = (campaign: Campaign | any): string[] => {
    const roles = [
        ...(Array.isArray(campaign?.targetRoles) ? campaign.targetRoles : []),
        ...(Array.isArray(campaign?.roleFilters) ? campaign.roleFilters : []),
        ...(Array.isArray(campaign?.target_roles) ? campaign.target_roles : []),
        ...(Array.isArray(campaign?.targetManagerIds) ? campaign.targetManagerIds : []),
        ...(Array.isArray(campaign?.target_manager_ids) ? campaign.target_manager_ids : []),
    ].map(String).filter(Boolean);
    return [...new Set(roles)];
};

export const campaignTargetsManager = (campaign: Campaign, managerIds: string[]): boolean => {
    if (!managerIds.length) return false;
    const roleIds = getCampaignManagerRoleIds(campaign);
    const managerSet = new Set(managerIds.map(String));
    return roleIds.some(id => managerSet.has(String(id)));
};

const buildCampaignRequestPayload = (payload: CreateCampaignPayload | Partial<CreateCampaignPayload>) => {
    const participantIds = payload.targetParticipantIds ?? payload.audienceIds;
    const roleFilters = payload.roleFilters ?? payload.targetRoles;
    const targetDelegationIds = payload.targetDelegationIds ?? normalizeDelegationIds(payload);
    const targetManagerIds = payload.targetManagerIds ?? normalizeManagerIds(payload);

    return {
        ...payload,
        ...(participantIds?.length ? {
            audienceIds: participantIds,
            targetParticipantIds: participantIds,
            audienceSize: payload.audienceSize ?? participantIds.length,
        } : {}),
        ...(roleFilters?.length ? {
            roleFilters,
            targetRoles: roleFilters,
            target_roles: roleFilters,
        } : {}),
        ...(targetDelegationIds.length ? { targetDelegationIds } : {}),
        ...(targetManagerIds.length ? { targetManagerIds } : {}),
    };
};

const unwrapList = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.campaigns)) return data.campaigns;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const unwrapItem = (data: any): any => {
    if (!data) return data;
    return data.data || data.campaign || data.item || data;
};

const pickStatNumber = (...values: unknown[]): number => {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
};

const normalizeInvitationStats = (raw: any): CampaignInvitationStats | undefined => {
    const source = raw?.invitationStats || raw?.invitation_stats;
    if (!source || typeof source !== 'object') return undefined;

    const deliveries = (source.deliveries || source.delivery || {}) as Record<string, unknown>;
    const rsvp = (source.rsvp || source.responses || source.response || {}) as Record<string, unknown>;

    const totalInvitations = pickStatNumber(
        source.totalInvitations,
        source.total_invitations,
        source.total,
        source.count,
    );
    const delivered = pickStatNumber(deliveries.delivered, deliveries.deliveredCount, deliveries.delivered_count);
    const opened = pickStatNumber(deliveries.opened, deliveries.openedCount, deliveries.opened_count);
    const accepted = pickStatNumber(rsvp.accepted, rsvp.yes, rsvp.confirmed);
    const declined = pickStatNumber(rsvp.declined, rsvp.decline, rsvp.no, rsvp.rejected);
    const maybe = pickStatNumber(rsvp.maybe);
    const pending = pickStatNumber(rsvp.pending, source.pending);

    if (
        totalInvitations === 0 &&
        delivered === 0 &&
        opened === 0 &&
        accepted === 0 &&
        declined === 0 &&
        maybe === 0 &&
        pending === 0
    ) {
        return undefined;
    }

    return {
        totalInvitations,
        deliveries: { delivered, opened },
        rsvp: { accepted, declined, maybe, pending },
    };
};

export const getCampaignInvitationStats = (campaign: Campaign | any): CampaignStatsView => {
    const invitationStats = campaign?.invitationStats || normalizeInvitationStats(campaign);
    const stats = campaign?.stats || {};

    if (invitationStats) {
        return {
            totalInvitations: invitationStats.totalInvitations,
            delivered: invitationStats.deliveries.delivered,
            opened: invitationStats.deliveries.opened,
            accepted: invitationStats.rsvp.accepted,
            maybe: invitationStats.rsvp.maybe,
            declined: invitationStats.rsvp.declined,
            pending: invitationStats.rsvp.pending,
            audienceSize: invitationStats.totalInvitations,
            sentCount: invitationStats.totalInvitations,
            deliveredCount: invitationStats.deliveries.delivered,
            openedCount: invitationStats.deliveries.opened,
            acceptedCount: invitationStats.rsvp.accepted,
            maybeCount: invitationStats.rsvp.maybe,
            declinedCount: invitationStats.rsvp.declined,
        };
    }

    const audienceSize = pickStatNumber(stats.audienceSize, campaign?.audienceSize);
    const sentCount = pickStatNumber(stats.sentCount, campaign?.sentCount, audienceSize);
    const deliveredCount = pickStatNumber(stats.deliveredCount, campaign?.deliveredCount);
    const openedCount = pickStatNumber(stats.openedCount, campaign?.openedCount);
    const acceptedCount = pickStatNumber(stats.acceptedCount, campaign?.acceptedCount);
    const maybeCount = pickStatNumber(stats.maybeCount, campaign?.maybeCount);
    const declinedCount = pickStatNumber(stats.declinedCount, campaign?.declinedCount);

    return {
        totalInvitations: sentCount || audienceSize,
        delivered: deliveredCount,
        opened: openedCount,
        accepted: acceptedCount,
        maybe: maybeCount,
        declined: declinedCount,
        pending: Math.max(0, (sentCount || audienceSize) - acceptedCount - maybeCount - declinedCount),
        audienceSize,
        sentCount,
        deliveredCount,
        openedCount,
        acceptedCount,
        maybeCount,
        declinedCount,
    };
};

const normalizeCampaign = (raw: any): Campaign => {
    const audienceIds = Array.isArray(raw?.audienceIds)
        ? raw.audienceIds
        : Array.isArray(raw?.targetParticipantIds)
            ? raw.targetParticipantIds
            : [];

    const targetRoles = Array.isArray(raw?.targetRoles)
        ? raw.targetRoles
        : Array.isArray(raw?.roleFilters)
            ? raw.roleFilters
            : Array.isArray(raw?.target_roles)
                ? raw.target_roles
                : [];

    const effectiveAudienceIds = [...new Set([...audienceIds, ...targetRoles].map(String))];

    const invitationStats = normalizeInvitationStats(raw);
    const stats = raw?.stats || {};
    const mergedStats = getCampaignInvitationStats({
        ...raw,
        invitationStats,
        stats,
        audienceIds: effectiveAudienceIds,
        audienceSize: stats.audienceSize ?? raw?.audienceSize ?? effectiveAudienceIds.length,
    });

    return {
        ...raw,
        id: String(raw?.id || raw?._id || ''),
        name: raw?.name || '',
        subject: raw?.subject || '',
        content: raw?.content || raw?.body || '',
        status: raw?.status || 'Draft',
        scheduledAt: raw?.scheduledAt || raw?.scheduled_at || undefined,
        sentAt: raw?.sentAt || raw?.sent_at || undefined,
        eventId: raw?.eventId || raw?.event_id || raw?.event?.id || '',
        templateId: raw?.templateId || raw?.template_id || raw?.template?.id || '',
        targetRoles,
        targetNationalities: Array.isArray(raw?.targetNationalities) ? raw.targetNationalities : [],
        targetDelegationIds: normalizeDelegationIds(raw),
        targetManagerIds: normalizeManagerIds(raw),
        rsvpDeadline: raw?.rsvpDeadline || raw?.rsvp_deadline || '',
        audienceIds: effectiveAudienceIds,
        targetParticipantIds: effectiveAudienceIds,
        audienceSize: mergedStats.audienceSize || effectiveAudienceIds.length,
        invitationStats,
        stats: {
            audienceSize: mergedStats.audienceSize || effectiveAudienceIds.length,
            sentCount: mergedStats.sentCount,
            deliveredCount: mergedStats.deliveredCount,
            openedCount: mergedStats.openedCount,
            acceptedCount: mergedStats.acceptedCount,
            maybeCount: mergedStats.maybeCount,
            declinedCount: mergedStats.declinedCount,
        },
        createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
        updatedAt: raw?.updatedAt || raw?.updated_at || new Date().toISOString(),
    };
};

export const isSentCampaignStatus = (status?: string): boolean => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'sent' || normalized === 'delivered' || normalized === 'published';
};

const isParticipantScopedCampaignEndpoint = (endpoint: string): boolean =>
    /\/participant\/|\/my\b|\/me\b/.test(endpoint);

const filterCampaignsForParticipant = (
    list: Campaign[],
    participantIds: string[],
    endpoint: string,
): Campaign[] => {
    const sent = list.filter(c => isSentCampaignStatus(c.status));
    if (isParticipantScopedCampaignEndpoint(endpoint)) {
        // Backend already scoped these campaigns to the logged-in participant.
        return sent;
    }
    return sent.filter(c => campaignTargetsParticipant(c, participantIds));
};

const campaignsFromInvitationPayload = (data: unknown): Campaign[] => {
    const rawItems = unwrapList(data);
    const campaigns: Campaign[] = [];

    for (const item of rawItems) {
        if (item?.campaign && typeof item.campaign === 'object') {
            campaigns.push(normalizeCampaign(item.campaign));
            continue;
        }
        if (item?.event && (item?.template || item?.subject || item?.content)) {
            campaigns.push(normalizeCampaign(item));
        }
    }

    return campaigns;
};

export const campaignTargetsParticipant = (campaign: Campaign, participantIds: string[]): boolean => {
    if (!participantIds.length) return false;
    const audience = [
        ...(campaign.audienceIds || []),
        ...(campaign.targetParticipantIds || []),
        ...(campaign.targetRoles || []),
    ].map(String);
    return participantIds.some(id => audience.includes(String(id)));
};

const fetchParticipantCampaignList = async (endpoint: string): Promise<Campaign[]> => {
    if (isEndpointBlocked(endpoint)) return [];
    const client = endpoint.includes('/participant/') ? participantCampaignClient : apiClient;
    try {
        const { data } = await client.get(endpoint);
        const list = unwrapList(data).map(normalizeCampaign);
        if (list.length > 0) {
            setCachedEndpoint('campaignsEndpoint', endpoint);
            return list;
        }
        const fromInvitations = campaignsFromInvitationPayload(data);
        if (fromInvitations.length > 0) {
            setCachedEndpoint('campaignsEndpoint', endpoint);
        }
        return fromInvitations;
    } catch (err: any) {
        markEndpointBlocked(endpoint, err?.response?.status);
        return [];
    }
};

const getParticipantCampaignEndpoints = (): string[] => {
    const participantEndpoints = [
        '/participant/campaigns/invitations',
        '/participant/campaigns',
    ];
    const fallbackEndpoints = [
        '/campaigns/my',
        '/campaigns/me',
    ];

    return orderEndpoints(
        'campaignsEndpoint',
        hasParticipantToken() ? participantEndpoints : [...participantEndpoints, ...fallbackEndpoints, '/campaigns'],
    );
};

export const getCampaigns = async (): Promise<Campaign[]> => {
    const { data } = await apiClient.get('/campaigns');
    return unwrapList(data).map(normalizeCampaign);
};

export const getMyCampaigns = async (): Promise<Campaign[]> => {
    for (const endpoint of getParticipantCampaignEndpoints()) {
        const list = await fetchParticipantCampaignList(endpoint);
        if (list.length > 0) return list;
    }
    return [];
};

export const getCampaignsForParticipant = async (participantIds: string[]): Promise<Campaign[]> => {
    const ids = [...new Set(participantIds.filter(Boolean).map(String))];
    if (ids.length === 0) return [];

    let bestList: Campaign[] = [];
    let bestTargeted: Campaign[] = [];

    for (const endpoint of getParticipantCampaignEndpoints()) {
        const list = await fetchParticipantCampaignList(endpoint);
        if (list.length === 0) continue;

        if (list.length > bestList.length) {
            bestList = list;
        }

        const targeted = filterCampaignsForParticipant(list, ids, endpoint);
        if (targeted.length > bestTargeted.length) {
            bestTargeted = targeted;
        }
        if (targeted.length > 0 && isParticipantScopedCampaignEndpoint(endpoint)) {
            return targeted;
        }
    }

    if (bestTargeted.length > 0) return bestTargeted;

    if (bestList.length > 0) {
        return filterCampaignsForParticipant(bestList, ids, '/campaigns');
    }

    return [];
};

const isManagerScopedCampaignEndpoint = (endpoint: string): boolean =>
    /\/manager\/|\/me\b|\/my\b/.test(endpoint);

const fetchManagerCampaignList = async (endpoint: string): Promise<Campaign[]> => {
    if (isEndpointBlocked(endpoint)) return [];
    const client = /\/manager\//.test(endpoint) ? managerCampaignClient : apiClient;
    try {
        const { data } = await client.get(endpoint);
        const list = unwrapList(data).map(normalizeCampaign);
        if (list.length > 0) {
            return list;
        }
        return campaignsFromInvitationPayload(data);
    } catch (err: any) {
        markEndpointBlocked(endpoint, err?.response?.status);
        return [];
    }
};

const getManagerCampaignEndpoints = (): string[] => [
    '/manager/campaigns',
    '/manager/campaigns/invitations',
    '/me/campaigns',
    '/campaigns/me',
    '/campaigns/my',
    '/participant/campaigns/invitations',
    '/participant/campaigns',
];

export const getCampaignsForManager = async (delegationIds: string[], managerId?: string): Promise<Campaign[]> => {
    const ids = [...new Set(delegationIds.filter(Boolean).map(String))];
    const managerIds = managerId ? [String(managerId)] : [];
    if (ids.length === 0 && managerIds.length === 0) return [];

    const matchesManagerScope = (campaign: Campaign) =>
        campaignTargetsDelegation(campaign, ids) ||
        campaignTargetsManager(campaign, managerIds);

    let bestTargeted: Campaign[] = [];

    for (const endpoint of getManagerCampaignEndpoints()) {
        const list = await fetchManagerCampaignList(endpoint);
        if (list.length === 0) continue;

        const sent = list.filter(c => isSentCampaignStatus(c.status));
        const targeted = sent.filter(c => matchesManagerScope(c));
        if (targeted.length > bestTargeted.length) {
            bestTargeted = targeted;
        }
        if (targeted.length > 0 && isManagerScopedCampaignEndpoint(endpoint)) {
            return targeted;
        }
    }

    if (bestTargeted.length > 0) return bestTargeted;

    const fromDelegations: Campaign[] = [];
    const seenCampaignIds = new Set<string>();

    for (const delegationId of ids) {
        const delegationEndpoints = [
            `/delegations/${delegationId}/campaigns`,
            `/me/delegations/${delegationId}/campaigns`,
            `/delegations/${delegationId}/invitations`,
        ];

        for (const endpoint of delegationEndpoints) {
            const list = await fetchManagerCampaignList(endpoint);
            if (list.length === 0) continue;

            const sent = list.filter(c => isSentCampaignStatus(c.status));
            for (const campaign of sent) {
                if (!matchesManagerScope(campaign) && !getCampaignDelegationIds(campaign).includes(delegationId)) {
                    continue;
                }
                if (seenCampaignIds.has(campaign.id)) continue;
                seenCampaignIds.add(campaign.id);
                fromDelegations.push(campaign);
            }
        }
    }

    return fromDelegations;
};

export const getCampaignById = async (id: string): Promise<Campaign> => {
    if (hasParticipantToken()) {
        throw new Error('Campaign detail is unavailable for participant tokens');
    }
    const { data } = await apiClient.get(`/campaigns/${id}`);
    return normalizeCampaign(unwrapItem(data));
};

export const createCampaign = async (payload: CreateCampaignPayload): Promise<Campaign> => {
    const { data } = await apiClient.post('/campaigns', buildCampaignRequestPayload(payload));
    return normalizeCampaign(unwrapItem(data));
};

export const updateCampaign = async (id: string, payload: Partial<CreateCampaignPayload>): Promise<Campaign> => {
    const { data } = await apiClient.patch(`/campaigns/${id}`, buildCampaignRequestPayload(payload));
    return normalizeCampaign(unwrapItem(data));
};

export const getCampaignStats = async (id: string): Promise<any> => {
    const { data } = await apiClient.get(`/campaigns/${id}/stats`);
    return data;
};

export const sendCampaignNow = async (id: string): Promise<void> => {
    await apiClient.post(`/campaigns/${id}/send-now`);
};

export const scheduleCampaign = async (id: string, scheduledAt: string): Promise<void> => {
    await apiClient.post(`/campaigns/${id}/schedule`, { scheduledAt });
};

export const deleteCampaign = async (id: string): Promise<void> => {
    await apiClient.delete(`/campaigns/${id}`);
};
