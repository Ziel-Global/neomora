import apiClient from './apiClient';

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
    // invitationIds?: string[];
    roleFilters?: string[];
}

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

    // const invitationIds = Array.isArray(raw?.invitationIds) ? raw.invitationIds : [];

    const stats = raw?.stats || {};

    return {
        ...raw,
        eventId: raw?.eventId || raw?.event?.id || '',
        templateId: raw?.templateId || raw?.template?.id || '',
        targetRoles: Array.isArray(raw?.targetRoles) ? raw.targetRoles : Array.isArray(raw?.roleFilters) ? raw.roleFilters : [],
        targetNationalities: Array.isArray(raw?.targetNationalities) ? raw.targetNationalities : [],
        targetDelegationIds: Array.isArray(raw?.targetDelegationIds) ? raw.targetDelegationIds : [],
        targetManagerIds: Array.isArray(raw?.targetManagerIds) ? raw.targetManagerIds : [],
        rsvpDeadline: raw?.rsvpDeadline || '',
        audienceIds,
        // invitationIds,
        targetParticipantIds: audienceIds,
        audienceSize: stats.audienceSize ?? raw?.audienceSize ?? audienceIds.length,
        stats: {
            audienceSize: stats.audienceSize ?? raw?.audienceSize ?? audienceIds.length,
            sentCount: stats.sentCount ?? raw?.sentCount ?? 0,
            deliveredCount: stats.deliveredCount ?? raw?.deliveredCount ?? 0,
            openedCount: stats.openedCount ?? raw?.openedCount ?? 0,
            acceptedCount: stats.acceptedCount ?? raw?.acceptedCount ?? 0,
            maybeCount: stats.maybeCount ?? raw?.maybeCount ?? 0,
            declinedCount: stats.declinedCount ?? raw?.declinedCount ?? 0,
        },
    };
};

export const getCampaigns = async (): Promise<Campaign[]> => {
    const { data } = await apiClient.get('/campaigns');
    return unwrapList(data).map(normalizeCampaign);
};

export const getCampaignById = async (id: string): Promise<Campaign> => {
    const { data } = await apiClient.get(`/campaigns/${id}`);
    return normalizeCampaign(unwrapItem(data));
};

export const createCampaign = async (payload: CreateCampaignPayload): Promise<Campaign> => {
    const { data } = await apiClient.post('/campaigns', payload);
    return normalizeCampaign(unwrapItem(data));
};

export const updateCampaign = async (id: string, payload: Partial<CreateCampaignPayload>): Promise<Campaign> => {
    const { data } = await apiClient.patch(`/campaigns/${id}`, payload);
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
