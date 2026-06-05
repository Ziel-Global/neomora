import apiClient from './apiClient';

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
    const endpoints = ['/me/registrations', '/registrations/me', '/registrations'];

    for (const endpoint of endpoints) {
        try {
            const { data } = await apiClient.get(endpoint);
            const result = Array.isArray(data) ? data : (data?.data || data?.registrations || []);
            if (Array.isArray(result)) return result;
        } catch (err: any) {
            if (err?.response?.status !== 404) {
                console.error(`Error fetching from ${endpoint}:`, err);
            }
            // Continue to next endpoint if 404 or just fails silently for now
        }
    }
    return [];
};

// GET /registrations/:id — Get registration by ID

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
