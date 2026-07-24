import apiClient from './apiClient';
import {
    isEndpointBlocked,
    markEndpointBlocked,
    orderEndpoints,
    setCachedEndpoint,
} from './endpointCache';

export interface Registration {
    id: string;
    participantId?: string;
    eventId?: string;
    status?: string;
    specialRequirements?: string;
    servicesRequired?: string;
    originCity?: string;
    departureAirport?: string;
    seatPreference?: string;
    mealPreference?: string;
    travelEmergencyContactName?: string;
    travelEmergencyContactPhone?: string;
    dietaryRequirements?: string;
    profilePhoto?: string;
    passportCopy?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
}

// ──────────────────────────────────────────────
// PARTICIPANT endpoints
// ──────────────────────────────────────────────

// POST /registrations — Create a new participant registration (multipart/form-data)
export const createRegistration = async (formData: FormData): Promise<Registration> => {
    const { data } = await apiClient.post('/registrations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

// GET /registrations — Get registrations (for manager, typically returns their own)
export const getMyRegistrations = async (): Promise<Registration[]> => {
    const endpoints = orderEndpoints('registrationsEndpoint', [
        '/registrations/me',
        '/participant/registrations',
        '/registrations',
    ]);

    for (const endpoint of endpoints) {
        if (isEndpointBlocked(endpoint)) continue;
        try {
            const { data } = await apiClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.registrations || []);
            if (Array.isArray(result)) {
                setCachedEndpoint('registrationsEndpoint', endpoint);
                return result;
            }
        } catch (err: any) {
            markEndpointBlocked(endpoint, err?.response?.status);
        }
    }
    return [];
};

// GET /registrations/:id — Get registration by ID
export const getRegistrationById = async (id: string): Promise<Registration> => {
    const { data } = await apiClient.get(`/registrations/${id}`);
    return data?.data || data;
};
// PUT /registrations/:id — Update registration form (JSON)
export const updateRegistrationForm = async (id: string, payload: Partial<Registration>): Promise<Registration> => {
    const { data } = await apiClient.put(`/registrations/${id}`, payload);
    return data;
};

// POST /registrations/:id/submit — Submit final registration
export const submitFinalRegistration = async (id: string): Promise<Registration> => {
    const { data } = await apiClient.post(`/registrations/${id}/submit`);
    return data;
};

export interface RegisteredParticipantOption {
    id: string;
    registrationId: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
    nationality?: string;
    passportNumber?: string;
    gender?: string;
    role?: string;
    teamId?: string;
    eventId?: string;
    status?: string;
}

const PENDING_TEAM_REGISTRATIONS_KEY = 'ems_pending_registrations_by_team';

export interface PendingTeamRegistration {
    participantId: string;
    registrationId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    registeredAt: string;
}

export const getRegistrationParticipantId = (registration: any): string => {
    if (!registration) return '';
    const participant =
        registration.participant && typeof registration.participant === 'object'
            ? registration.participant
            : null;

    return String(
        registration.participantId ||
        registration.participant_id ||
        participant?.id ||
        participant?._id ||
        '',
    );
};

export const normalizeRegistrationParticipant = (
    registration: any,
): RegisteredParticipantOption | null => {
    if (!registration) return null;

    const participant =
        registration.participant && typeof registration.participant === 'object'
            ? registration.participant
            : {};

    const participantId = getRegistrationParticipantId(registration);
    if (!participantId) return null;

    const firstName =
        registration.firstName ||
        registration.first_name ||
        participant.firstName ||
        participant.first_name ||
        '';
    const lastName =
        registration.lastName ||
        registration.last_name ||
        participant.lastName ||
        participant.last_name ||
        '';
    const email = registration.email || participant.email || '';

    return {
        id: participantId,
        registrationId: String(registration.id || registration._id || ''),
        firstName,
        lastName,
        name:
            registration.name ||
            participant.name ||
            `${firstName} ${lastName}`.trim() ||
            email ||
            participantId,
        email,
        phone: registration.phone || participant.phone,
        nationality:
            registration.nationality ||
            registration.country ||
            participant.nationality ||
            participant.country,
        passportNumber:
            registration.passportNumber ||
            registration.passport_number ||
            participant.passportNumber ||
            participant.passport_number,
        gender: registration.gender || participant.gender,
        role:
            registration.jobTitle ||
            registration.participantRole ||
            registration.role ||
            participant.role,
        teamId: String(
            registration.teamId ||
            registration.team_id ||
            registration.team?.id ||
            registration.team?._id ||
            '',
        ),
        eventId: String(
            registration.eventId ||
            registration.event_id ||
            registration.event?.id ||
            registration.event?._id ||
            '',
        ),
        status: registration.status,
    };
};

const readPendingRegistrationMap = (): Record<string, PendingTeamRegistration[]> => {
    try {
        return JSON.parse(sessionStorage.getItem(PENDING_TEAM_REGISTRATIONS_KEY) || '{}');
    } catch {
        return {};
    }
};

const writePendingRegistrationMap = (map: Record<string, PendingTeamRegistration[]>) => {
    sessionStorage.setItem(PENDING_TEAM_REGISTRATIONS_KEY, JSON.stringify(map));
};

export const addPendingTeamRegistration = (
    teamId: string,
    entry: PendingTeamRegistration,
): void => {
    if (!teamId || !entry.participantId) return;
    const map = readPendingRegistrationMap();
    const existing = map[teamId] || [];
    const deduped = existing.filter(
        (item) =>
            item.participantId !== entry.participantId &&
            item.email.toLowerCase() !== entry.email.toLowerCase(),
    );
    map[teamId] = [...deduped, entry];
    writePendingRegistrationMap(map);
};

export const getPendingTeamRegistrations = (teamId: string): PendingTeamRegistration[] => {
    if (!teamId) return [];
    return readPendingRegistrationMap()[teamId] || [];
};

export const removePendingTeamRegistrations = (
    teamId: string,
    participantIds: string[],
): void => {
    if (!teamId || participantIds.length === 0) return;
    const map = readPendingRegistrationMap();
    const ids = new Set(participantIds);
    map[teamId] = (map[teamId] || []).filter((item) => !ids.has(item.participantId));
    writePendingRegistrationMap(map);
};

export const getRegistrationReferenceId = (registration: unknown): string => {
    const reg = registration as Record<string, unknown> | null | undefined;
    if (!reg) return '';

    const nested = reg.data as Record<string, unknown> | undefined;
    return String(
        reg.id ||
        reg._id ||
        reg.registrationId ||
        reg.registration_id ||
        nested?.id ||
        nested?._id ||
        '',
    );
};

export const getRegistrationDocuments = async (registrationId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/registrations/${registrationId}/documents`);
    return Array.isArray(data) ? data : (data?.data || data?.documents || []);
};

export interface RegistrationDocumentUpload {
    file: File;
    type: string;
}

export const uploadRegistrationDocuments = async (
    registrationId: string,
    documents: RegistrationDocumentUpload[],
): Promise<void> => {
    for (const doc of documents) {
        const formData = new FormData();
        formData.append(doc.type, doc.file);
        formData.append('type', doc.type);
        await apiClient.post(`/registrations/${registrationId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    }
};


// ──────────────────────────────────────────────
// ADMIN endpoints
// ──────────────────────────────────────────────

// GET /registrations/admin/all — Get all registrations (admin)
export const getRegistrations = async (): Promise<Registration[]> => {
    const { data } = await apiClient.get('/registrations/admin/all');
    return Array.isArray(data) ? data : (data?.data || data?.registrations || []);
};

// GET /admin/registrations/by-team — Get registrations grouped by team (admin)
export const getRegistrationsByTeam = async (): Promise<any[]> => {
    const { data } = await apiClient.get('/admin/registrations/by-team');
    return Array.isArray(data) ? data : (data?.data || data?.teams || []);
};

// POST /registrations/:id/start-review — Set status to Under Review
export const startRegistrationReview = async (id: string): Promise<void> => {
    await apiClient.post(`/registrations/${id}/start-review`);
};

// POST /registrations/:id/approve — Approve registration
export const approveRegistration = async (id: string): Promise<void> => {
    await apiClient.post(`/registrations/${id}/approve`);
};

// POST /registrations/:id/reject — Reject registration
export const rejectRegistration = async (id: string, reason?: string): Promise<void> => {
    await apiClient.post(`/registrations/${id}/reject`, reason ? { reason } : undefined);
};

// POST /registrations/:id/request-update — Request update from participant
export const requestRegistrationUpdate = async (id: string, reason?: string): Promise<void> => {
    await apiClient.post(`/registrations/${id}/request-update`, reason ? { reason } : undefined);
};

// GET /registrations/event/:eventId/participants
export const getEventParticipants = async (eventId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/registrations/event/${eventId}/participants`);
    return Array.isArray(data) ? data : (data?.data || data?.participants || []);
};
