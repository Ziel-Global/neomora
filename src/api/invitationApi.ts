import apiClient from './apiClient';
import axios from 'axios';

export interface Invitation {
    id: string;
    campaignId?: string;
    participantId?: string;
    eventId: string;
    status: string;
    token?: string;
    sentAt?: string;
    deliveredAt?: string;
    openedAt?: string;
    respondedAt?: string;
    rsvpResponse?: string;
    rsvpDeadline?: string;
    templateId?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
}

// Create a participant-specific axios client that always uses participant token
const participantClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
});

participantClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('ems_participant_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Fetch invitations for the currently logged-in participant
export const getMyInvitations = async (): Promise<Invitation[]> => {
    // Try multiple known endpoint patterns
    const endpoints = [
        '/me/invitations',
        '/participant/invitations',
        '/invitations/my',
    ];

    const token = localStorage.getItem('ems_participant_token');
    if (!token) {
        console.warn('No participant token found');
        return [];
    }

    for (const endpoint of endpoints) {
        try {
            const { data } = await participantClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.invitations || []);
            return Array.isArray(result) ? result : [];
        } catch (err: any) {
            // If 404, try next endpoint. Otherwise rethrow
            if (err?.response?.status !== 404) {
                throw err;
            }
            console.warn(`Endpoint ${endpoint} returned 404, trying next...`);
        }
    }

    return [];
};

// Fetch all invitations (admin)
export const getAllInvitations = async (): Promise<Invitation[]> => {
    const { data } = await apiClient.get('/invitations');
    return Array.isArray(data) ? data : (data?.data || data?.invitations || []);
};

// Get a single invitation by token
export const getInvitationByToken = async (token: string): Promise<Invitation> => {
    const { data } = await apiClient.get(`/invitations/token/${token}`);
    return data;
};

// Respond to an invitation (no auth needed usually, uses token)
export const respondToInvitation = async (token: string, response: 'Accepted' | 'Declined' | 'Maybe'): Promise<Invitation> => {
    const { data } = await apiClient.post(`/invitations/token/${token}/respond`, { response });
    return data;
};

// Mark invitation as opened
export const markInvitationOpened = async (token: string): Promise<void> => {
    await apiClient.post(`/invitations/token/${token}/open`).catch(() => { /* silent */ });
};
