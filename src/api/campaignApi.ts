import apiClient from './apiClient';
import axios from 'axios';
import {
    hasParticipantToken,
    isEndpointBlocked,
    markEndpointBlocked,
    orderEndpoints,
    setCachedEndpoint,
} from './endpointCache';

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
    // invitationIds?: string[];
    targetParticipantIds?: string[];
    audienceSize?: number | null;
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

const buildCampaignRequestPayload = (payload: CreateCampaignPayload | Partial<CreateCampaignPayload>) => {
    const participantIds = payload.targetParticipantIds ?? payload.audienceIds;
    const roleFilters = payload.roleFilters ?? payload.targetRoles;

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
        } : {}),
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
            : [];

    const effectiveAudienceIds = [...new Set([...audienceIds, ...targetRoles].map(String))];

    const stats = raw?.stats || {};

    return {
        ...raw,
        eventId: raw?.eventId || raw?.event?.id || '',
        templateId: raw?.templateId || raw?.template?.id || '',
        targetRoles,
        targetNationalities: Array.isArray(raw?.targetNationalities) ? raw.targetNationalities : [],
        targetDelegationIds: Array.isArray(raw?.targetDelegationIds) ? raw.targetDelegationIds : [],
        targetManagerIds: Array.isArray(raw?.targetManagerIds) ? raw.targetManagerIds : [],
        rsvpDeadline: raw?.rsvpDeadline || '',
        audienceIds: effectiveAudienceIds,
        targetParticipantIds: effectiveAudienceIds,
        audienceSize: stats.audienceSize ?? raw?.audienceSize ?? effectiveAudienceIds.length,
        stats: {
            audienceSize: stats.audienceSize ?? raw?.audienceSize ?? effectiveAudienceIds.length,
            sentCount: stats.sentCount ?? raw?.sentCount ?? 0,
            deliveredCount: stats.deliveredCount ?? raw?.deliveredCount ?? 0,
            openedCount: stats.openedCount ?? raw?.openedCount ?? 0,
            acceptedCount: stats.acceptedCount ?? raw?.acceptedCount ?? 0,
            maybeCount: stats.maybeCount ?? raw?.maybeCount ?? 0,
            declinedCount: stats.declinedCount ?? raw?.declinedCount ?? 0,
        },
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
