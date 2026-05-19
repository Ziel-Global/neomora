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
    stats: {
        sentCount: number;
        deliveredCount: number;
        openedCount: number;
        acceptedCount: number;
        maybeCount: number;
        declinedCount: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateCampaignPayload {
    name: string;
    subject: string;
    content: string;
    eventId: string;
    rsvpDeadline: string;
    audienceIds?: string[];
    roleFilters?: string[];
}

export const getCampaigns = async (): Promise<Campaign[]> => {
    const { data } = await apiClient.get('/campaigns');
    return data;
};

export const getCampaignById = async (id: string): Promise<Campaign> => {
    const { data } = await apiClient.get(`/campaigns/${id}`);
    return data;
};

export const createCampaign = async (payload: CreateCampaignPayload): Promise<Campaign> => {
    const { data } = await apiClient.post('/campaigns', payload);
    return data;
};

export const updateCampaign = async (id: string, payload: Partial<CreateCampaignPayload>): Promise<Campaign> => {
    const { data } = await apiClient.patch(`/campaigns/${id}`, payload);
    return data;
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
