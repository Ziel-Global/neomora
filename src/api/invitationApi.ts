// import apiClient from './apiClient';
// import axios from 'axios';

// export interface Invitation {
//     id: string;
//     campaignId?: string;
//     participantId?: string;
//     eventId: string;
//     status: string;
//     token?: string;
//     sentAt?: string;
//     deliveredAt?: string;
//     openedAt?: string;
//     respondedAt?: string;
//     rsvpResponse?: string;
//     rsvpDeadline?: string;
//     templateId?: string;
//     createdAt?: string;
//     updatedAt?: string;
//     [key: string]: any;
// }

// // Create a participant-specific axios client that always uses participant token
// const participantClient = axios.create({
//     baseURL: import.meta.env.VITE_API_BASE_URL,
//     headers: { 'Content-Type': 'application/json' },
// });

// participantClient.interceptors.request.use((config) => {
//     const token = localStorage.getItem('ems_participant_token');
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// });

// // Fetch invitations for the currently logged-in participant
// export const getMyInvitations = async (): Promise<Invitation[]> => {
//     // Try multiple known endpoint patterns
//     const endpoints = [
//         '/invitations/me',
//         '/participant/invitations',
//         '/invitations/my',
//     ];

//     const token = localStorage.getItem('ems_participant_token');
//     if (!token) {
//         console.warn('No participant token found');
//         return [];
//     }

//     for (const endpoint of endpoints) {
//         try {
//             const { data } = await participantClient.get(endpoint);
//             const result = Array.isArray(data) ? data : (data?.data || data?.invitations || []);
//             return Array.isArray(result) ? result : [];
//         } catch (err: any) {
//             // If 404, try next endpoint. Otherwise rethrow
//             if (err?.response?.status !== 404) {
//                 throw err;
//             }
//             console.warn(`Endpoint ${endpoint} returned 404, trying next...`);
//         }
//     }

//     return [];
// };

// // Fetch all invitations (admin)
// export const getAllInvitations = async (): Promise<Invitation[]> => {
//     const { data } = await apiClient.get('/invitations');
//     return Array.isArray(data) ? data : (data?.data || data?.invitations || []);
// };

// // Get a single invitation by token
// export const getInvitationByToken = async (token: string): Promise<Invitation> => {
//     const { data } = await apiClient.get(`/invitations/token/${token}`);
//     return data;
// };

// // Respond to an invitation (no auth needed usually, uses token)
// export const respondToInvitation = async (token: string, response: 'Accepted' | 'Declined' | 'Maybe'): Promise<Invitation> => {
//     const { data } = await apiClient.post(`/invitations/token/${token}/respond`, { response });
//     return data;
// };

// // Mark invitation as opened
// export const markInvitationOpened = async (token: string): Promise<void> => {
//     await apiClient.post(`/invitations/token/${token}/open`).catch(() => { /* silent */ });
// };



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

// Create a client that works for BOTH participant and manager sessions.
// getMyInvitations() is used from both the participant "My Invitations" page
// and the manager "Delegation Invitations" page — whichever role is actually
// logged in has its token in a different localStorage key, so we check both
// (participant token first, then manager token) rather than hardcoding one.
const myInvitationsClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

myInvitationsClient.interceptors.request.use((config) => {
    const token =
        localStorage.getItem('ems_participant_token') ||
        localStorage.getItem('ems_manager_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Fetch invitations for the currently logged-in participant OR manager.
// For a manager, the backend is expected to resolve "my invitations" as the
// invitations belonging to participants in their delegation/country — same
// way getMyTeams()/getMyRegistrations() resolve "mine" based on the manager's
// token. If your backend instead needs a distinct manager route, swap the
// endpoints list below for that route.
export const getMyInvitations = async (): Promise<Invitation[]> => {
    // Try multiple known endpoint patterns
    const endpoints = [
        '/invitations/me',
        '/participant/invitations',
        '/invitations/my',
    ];

    const token =
        localStorage.getItem('ems_participant_token') ||
        localStorage.getItem('ems_manager_token');
    if (!token) {
        console.warn('No participant or manager token found');
        return [];
    }

    for (const endpoint of endpoints) {
        try {
            const { data } = await myInvitationsClient.get(endpoint);
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