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
import {
    getCachedEndpoint,
    hasParticipantToken,
    isEndpointBlocked,
    markEndpointBlocked,
    orderEndpoints,
    setCachedEndpoint,
} from './endpointCache';

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
    event?: {
        id?: string;
        name?: string;
        city?: string;
        startDate?: string;
        endDate?: string;
        start_date?: string;
        end_date?: string;
        [key: string]: unknown;
    };
    template?: {
        id?: string;
        name?: string;
        subject?: string;
        body?: string;
        content?: string;
        language?: string;
        variables?: string[];
        [key: string]: unknown;
    };
    campaign?: {
        id?: string;
        name?: string;
        eventId?: string;
        templateId?: string;
        rsvpDeadline?: string;
        event?: Invitation['event'];
        template?: Invitation['template'];
        [key: string]: unknown;
    };
    [key: string]: any;
}

const normalizeEmbeddedTemplate = (raw: any) => {
    if (!raw || typeof raw !== 'object') return undefined;
    return {
        id: String(raw.id || raw._id || ''),
        name: raw.name || '',
        subject: raw.subject || '',
        body: raw.body || raw.content || '',
        language: raw.language || 'en',
        variables: Array.isArray(raw.variables) ? raw.variables : [],
        createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    };
};

export const normalizeInvitation = (raw: any): Invitation => {
    const event = raw?.event && typeof raw.event === 'object' ? raw.event : undefined;
    const template = normalizeEmbeddedTemplate(raw?.template);
    const campaignRaw = raw?.campaign && typeof raw.campaign === 'object' ? raw.campaign : undefined;
    const campaign = campaignRaw
        ? {
            ...campaignRaw,
            event: campaignRaw.event || event,
            template: normalizeEmbeddedTemplate(campaignRaw.template) || template,
            targetDelegationIds: Array.isArray(campaignRaw.targetDelegationIds)
                ? campaignRaw.targetDelegationIds
                : campaignRaw.targetDelegationId
                    ? [campaignRaw.targetDelegationId]
                    : Array.isArray(campaignRaw.target_delegation_ids)
                        ? campaignRaw.target_delegation_ids
                        : campaignRaw.target_delegation_id
                            ? [campaignRaw.target_delegation_id]
                            : [],
            targetManagerIds: Array.isArray(campaignRaw.targetManagerIds)
                ? campaignRaw.targetManagerIds
                : campaignRaw.targetManagerId
                    ? [campaignRaw.targetManagerId]
                    : [],
        }
        : undefined;

    const managerId =
        raw?.managerId ||
        raw?.manager_id ||
        raw?.manager?.id ||
        raw?.manager?._id ||
        campaign?.targetManagerIds?.[0] ||
        '';
    const delegationId =
        raw?.delegationId ||
        raw?.delegation_id ||
        raw?.delegation?.id ||
        raw?.delegation?._id ||
        campaign?.targetDelegationIds?.[0] ||
        '';
    const managerEmail =
        raw?.managerEmail ||
        raw?.manager_email ||
        raw?.manager?.email ||
        '';
    const recipientType =
        raw?.recipientType ||
        raw?.recipient_type ||
        (managerId || delegationId ? 'manager' : 'participant');

    return {
        ...raw,
        id: String(raw?.id || raw?._id || ''),
        managerId,
        managerEmail,
        delegationId,
        recipientType,
        eventId:
            raw?.eventId ||
            raw?.event_id ||
            event?.id ||
            campaign?.eventId ||
            campaign?.event?.id ||
            '',
        templateId:
            raw?.templateId ||
            raw?.template_id ||
            template?.id ||
            campaign?.templateId ||
            campaign?.template?.id ||
            '',
        campaignId: raw?.campaignId || raw?.campaign_id || campaign?.id || '',
        rsvpDeadline:
            raw?.rsvpDeadline ||
            raw?.rsvp_deadline ||
            campaign?.rsvpDeadline ||
            campaign?.rsvp_deadline ||
            '',
        event: event || campaign?.event,
        template: template || campaign?.template,
        campaign,
    };
};

const normalizeInvitationList = (data: unknown): Invitation[] => {
    const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.data)
            ? (data as any).data
            : Array.isArray((data as any)?.invitations)
                ? (data as any).invitations
                : [];
    return list.map(normalizeInvitation).filter(inv => Boolean(inv.id));
};

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
    const participantEndpoints = [
        '/invitations/me',
        '/participant/invitations',
    ];
    const managerEndpoints = [
        '/manager/invitations',
        '/manager/campaigns/invitations',
        '/invitations/manager/me',
        '/invitations/me',
        '/participant/invitations',
        '/invitations/my',
        '/participant/campaigns/invitations',
    ];

    const managerToken = localStorage.getItem('ems_manager_token');
    const participantToken = localStorage.getItem('ems_participant_token');
    const token = participantToken || managerToken;
    if (!token) {
        return [];
    }

    const isManagerSession = !!managerToken && !participantToken;
    const endpoints = orderEndpoints(
        'invitationsEndpoint',
        isManagerSession ? managerEndpoints : participantEndpoints.concat(managerEndpoints.filter(e => !participantEndpoints.includes(e))),
    );

    for (const endpoint of endpoints) {
        if (isEndpointBlocked(endpoint)) continue;
        try {
            const { data } = await myInvitationsClient.get(endpoint);
            const result = normalizeInvitationList(data);
            if (result.length > 0) {
                setCachedEndpoint('invitationsEndpoint', endpoint);
                return result;
            }
            // Manager endpoints may legitimately return an empty array — keep trying.
            if (isManagerSession && /\/manager\//.test(endpoint) && Array.isArray(data?.data ?? data)) {
                setCachedEndpoint('invitationsEndpoint', endpoint);
            }
        } catch (err: any) {
            markEndpointBlocked(endpoint, err?.response?.status);
        }
    }

    const cachedEndpoint = getCachedEndpoint('invitationsEndpoint');
    if (cachedEndpoint && isManagerSession) {
        try {
            const { data } = await myInvitationsClient.get(cachedEndpoint);
            const parsed = normalizeInvitationList(data);
            if (parsed.length > 0) return parsed;
        } catch {
            // ignore
        }
    }

    return [];
};

export const getInvitationsForDelegations = async (delegationIds: string[]): Promise<Invitation[]> => {
    const ids = [...new Set(delegationIds.filter(Boolean).map(String))];
    if (ids.length === 0) return [];

    const merged = new Map<string, Invitation>();
    const endpointsFor = (delegationId: string) => [
        `/delegations/${delegationId}/invitations`,
        `/me/delegations/${delegationId}/invitations`,
    ];

    for (const delegationId of ids) {
        for (const endpoint of endpointsFor(delegationId)) {
            if (isEndpointBlocked(endpoint)) continue;
            try {
                const { data } = await myInvitationsClient.get(endpoint);
                const result = normalizeInvitationList(data);
                for (const inv of result) {
                    merged.set(inv.id, inv);
                }
            } catch (err: any) {
                markEndpointBlocked(endpoint, err?.response?.status);
            }
        }
    }

    return Array.from(merged.values());
};

// Fetch all invitations (admin)
export const getAllInvitations = async (): Promise<Invitation[]> => {
    const { data } = await apiClient.get('/invitations');
    return normalizeInvitationList(data);
};

/** Admin: invitations for a specific campaign (cross-browser safe). */
export const getInvitationsByCampaign = async (campaignId: string): Promise<Invitation[]> => {
    if (!campaignId) return [];

    const scopedEndpoints = [
        `/campaigns/${campaignId}/invitations`,
        `/invitations?campaignId=${encodeURIComponent(campaignId)}`,
    ];

    for (const endpoint of scopedEndpoints) {
        if (isEndpointBlocked(endpoint)) continue;
        try {
            const { data } = await apiClient.get(endpoint);
            const result = normalizeInvitationList(data).filter(
                inv => !inv.campaignId || String(inv.campaignId) === String(campaignId),
            );
            if (result.length > 0) return result;
        } catch (err: any) {
            markEndpointBlocked(endpoint, err?.response?.status);
        }
    }

    try {
        const all = await getAllInvitations();
        return all.filter(inv => String(inv.campaignId) === String(campaignId));
    } catch {
        return [];
    }
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

export type InvitationResponse = 'Accepted' | 'Declined' | 'Maybe';

/** Authenticated RSVP: PATCH /invitations/:invitationId/respond (participant + manager) */
export const respondToInvitationById = async (
    invitationId: string,
    response: InvitationResponse,
    notes?: string,
): Promise<Invitation> => {
    const { data } = await myInvitationsClient.patch(`/invitations/${invitationId}/respond`, {
        response,
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
    });
    const raw = data?.data || data?.invitation || data;
    return normalizeInvitation(raw);
};

// Mark invitation as opened
export const markInvitationOpened = async (token: string): Promise<void> => {
    await apiClient.post(`/invitations/token/${token}/open`).catch(() => { /* silent */ });
};

export const getInvitationById = async (id: string): Promise<Invitation | null> => {
    const endpoints = [`/invitations/${id}`];

    for (const endpoint of endpoints) {
        if (isEndpointBlocked(endpoint)) continue;
        try {
            const { data } = await myInvitationsClient.get(endpoint);
            const raw = data?.data || data?.invitation || data;
            if (raw) return normalizeInvitation(raw);
        } catch (err: any) {
            markEndpointBlocked(endpoint, err?.response?.status);
        }
    }

    const cachedEndpoint = getCachedEndpoint('invitationsEndpoint');
    if (cachedEndpoint) {
        try {
            const { data } = await myInvitationsClient.get(cachedEndpoint);
            const result = normalizeInvitationList(data);
            return result.find(inv => inv.id === id) || null;
        } catch {
            // ignore
        }
    }

    return null;
};