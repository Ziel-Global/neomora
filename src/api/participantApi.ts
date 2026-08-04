import apiClient from './apiClient';
import { EMSParticipant } from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
import { getApprovedAdminRegistrations, getRegistrationParticipantId, getRegistrations } from './registrationApi';
import {
    hasParticipantToken,
    isEndpointBlocked,
    markEndpointBlocked,
    orderEndpoints,
    setCachedEndpoint,
} from './endpointCache';
export interface ParticipantPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string; // 'male' | 'female' | 'other'
  nationality: string;
  organization: string;
  jobTitle?: string;
  role: string;
  dietaryNotes?: string;
  accessibilityNeeds?: string;
}

export interface ParticipantCreationResult {
  participant: EMSParticipant;
  setupEmailSent: boolean;
}

export interface ManagerParticipantPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  organization?: string;
  jobTitle?: string;
  role?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dietaryRequirements?: string;
  medicalConditions?: string;
  sports?: string[];
}

const unwrapList = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.participants)) return record.participants;
    if (Array.isArray(record.items)) return record.items;
  }
  return [];
};

const normalizeName = (name?: string) => {
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

export const normalizeParticipant = (raw: any, fallbackId?: string): EMSParticipant | null => {
  if (!raw) return null;

  const source =
    (raw.participant && typeof raw.participant === 'object' ? raw.participant : null) ||
    (raw.participantId && typeof raw.participantId === 'object' ? raw.participantId : null) ||
    (raw.user && typeof raw.user === 'object' ? raw.user : null) ||
    raw;

  const id =
    source.id ||
    source._id ||
    fallbackId ||
    raw.participantId ||
    raw.participant_id ||
    (typeof raw.participantId === 'string' ? raw.participantId : undefined) ||
    (typeof raw.participant_id === 'string' ? raw.participant_id : undefined);

  const email = source.email || raw.email || '';
  if (!id && !email) return null;

  const nameFallback = normalizeName(source.name || raw.name);

  return {
    id: String(id || email),
    firstName: source.firstName || nameFallback.firstName || 'Unknown',
    lastName: source.lastName || nameFallback.lastName || '',
    email,
    phone: source.phone || raw.phone || '',
    gender: source.gender || 'other',
    nationality: source.nationality || source.country || raw.country || raw.nationality || '',
    passportNumber: source.passportNumber || source.passport_number,
    passportExpiry: source.passportExpiry || source.passport_expiry,
    organization: source.organization || raw.organization || '',
    jobTitle: source.jobTitle || source.job_title,
    role: (source.role || raw.role || 'Athlete') as ParticipantRole,
    dietaryNotes: source.dietaryNotes || source.dietary_notes || '',
    accessibilityNeeds: source.accessibilityNeeds || source.accessibility_needs || '',
    sports: Array.isArray(source.sports) ? source.sports : (Array.isArray(raw.sports) ? raw.sports : undefined),
    createdAt: source.createdAt || source.created_at || raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: source.updatedAt || source.updated_at || raw.updatedAt || raw.updated_at || new Date().toISOString(),
  };
};

const mergeParticipants = (...lists: EMSParticipant[][]): EMSParticipant[] => {
  const byKey = new Map<string, EMSParticipant>();

  for (const list of lists) {
    for (const participant of list) {
      const key = participant.id || participant.email.toLowerCase();
      if (!key) continue;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, participant);
        continue;
      }

      byKey.set(key, {
        ...existing,
        ...participant,
        firstName: participant.firstName || existing.firstName,
        lastName: participant.lastName || existing.lastName,
        email: participant.email || existing.email,
        phone: participant.phone || existing.phone,
        nationality: participant.nationality || existing.nationality,
        organization: participant.organization || existing.organization,
        role: participant.role || existing.role,
        sports: participant.sports || existing.sports,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

export interface AdminApprovedParticipant extends EMSParticipant {
  registrationId?: string;
  registrationStatus?: string;
}

export const getParticipants = async (): Promise<EMSParticipant[]> => {
  const { data } = await apiClient.get('/admin/participants');
  return unwrapList(data)
    .map((item) => normalizeParticipant(item))
    .filter(Boolean) as EMSParticipant[];
};

/** Admin members page: approved registrations from admin/all + admin registration-team. */
export const getApprovedParticipantsFromRegistrations = async (
  eventId?: string,
): Promise<AdminApprovedParticipant[]> => {
  const registrations = await getApprovedAdminRegistrations(eventId);

  const participants = registrations
    .map((reg) => {
      const participant = normalizeParticipant(
        reg,
        getRegistrationParticipantId(reg) || undefined,
      );
      if (!participant) return null;

      return {
        ...participant,
        registrationId: String(reg.id || reg._id || ''),
        registrationStatus: 'Approved',
      } satisfies AdminApprovedParticipant;
    })
    .filter(Boolean) as AdminApprovedParticipant[];

  return mergeParticipants(participants);
};

/**
 * Admin Members page: load every participant, then enrich them with approved
 * registration details when available. This keeps standalone members visible
 * before they have been invited or registered for an event.
 */
export const getAdminMembers = async (): Promise<AdminApprovedParticipant[]> => {
  const [allParticipants, approvedParticipants] = await Promise.all([
    getParticipants(),
    getApprovedParticipantsFromRegistrations(),
  ]);

  const approvedByKey = new Map<string, AdminApprovedParticipant>();
  for (const participant of approvedParticipants) {
    if (participant.id) approvedByKey.set(participant.id, participant);
    if (participant.email) approvedByKey.set(participant.email.toLowerCase(), participant);
  }

  return mergeParticipants(allParticipants, approvedParticipants)
    .map((participant) => {
      const approved = approvedByKey.get(participant.id) || approvedByKey.get(participant.email.toLowerCase());
      return {
        ...participant,
        registrationId: approved?.registrationId,
        registrationStatus: approved?.registrationStatus,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAllParticipantsForInvitations = async (): Promise<EMSParticipant[]> => {
  const [adminParticipants, registrations] = await Promise.all([
    getParticipants().catch(() => []),
    getRegistrations().catch(() => []),
  ]);

  const registrationParticipants = registrations
    .map((reg) =>
      normalizeParticipant(
        reg,
        reg.participantId ||
          reg.participant_id ||
          (typeof reg.participantId === 'object' ? reg.participantId?.id || reg.participantId?._id : undefined)
      )
    )
    .filter(Boolean) as EMSParticipant[];

  return mergeParticipants(adminParticipants, registrationParticipants);
};

export const createParticipant = async (payload: ParticipantPayload): Promise<ParticipantCreationResult> => {
  const { data } = await apiClient.post('/admin/participants', payload);
  const participant = normalizeParticipant(data?.participant || data) || (data?.participant as EMSParticipant);
  return {
    participant,
    setupEmailSent: data?.setupEmailSent !== false,
  };
};

export const sendParticipantSetupEmail = async (id: string): Promise<{ message: string }> => {
  const { data } = await apiClient.post(`/admin/participants/${id}/send-setup-email`);
  return data;
};

export const createManagerParticipant = async (
  payload: ManagerParticipantPayload,
): Promise<EMSParticipant> => {
  const { data } = await apiClient.post('/manager/participants', payload);
  const raw = (data as any)?.data || (data as any)?.participant || data;
  return normalizeParticipant(raw) || (raw as EMSParticipant);
};

export const getManagerParticipants = async (): Promise<EMSParticipant[]> => {
  const { data } = await apiClient.get('/manager/participants');
  return unwrapList(data)
    .map((item) => normalizeParticipant(item))
    .filter(Boolean) as EMSParticipant[];
};

export const deleteManagerParticipant = async (id: string): Promise<void> => {
  await apiClient.delete(`/manager/participants/${id}`);
};

export const updateParticipant = async (id: string, payload: Partial<ParticipantPayload>): Promise<EMSParticipant> => {
  const { data } = await apiClient.put(`/admin/participants/${id}`, payload);
  return normalizeParticipant(data, id) || (data as EMSParticipant);
};

export const deleteParticipant = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/participants/${id}`);
};

export const getMyParticipantProfile = async (): Promise<EMSParticipant | null> => {
  const endpoints = orderEndpoints('profileEndpoint', [
    '/participant/me',
    '/participants/me',
    '/auth/me',
  ]);

  for (const endpoint of endpoints) {
    if (isEndpointBlocked(endpoint)) continue;
    try {
      const { data } = await apiClient.get(endpoint);
      const raw = data?.data || data?.participant || data?.user || data;

      const recordId =
        (typeof raw?.participantId === 'string' ? raw.participantId : undefined) ||
        (typeof raw?.participant_id === 'string' ? raw.participant_id : undefined) ||
        raw?.participant?.id ||
        raw?.participant?._id ||
        raw?.id ||
        raw?._id;

      const normalized = normalizeParticipant({ ...raw, id: recordId }, recordId);
      if (normalized?.id) {
        setCachedEndpoint('profileEndpoint', endpoint);
        return normalized;
      }
    } catch (err: any) {
      markEndpointBlocked(endpoint, err?.response?.status);
    }
  }

  return null;
};

export const resolveParticipantIdentityIds = async (
  session: { id?: string; participantId?: string; email?: string; teamMemberId?: string; [key: string]: unknown } | null,
  options?: { allowNetwork?: boolean },
): Promise<string[]> => {
  const ids = new Set<string>();
  if (!session) return [];

  [session.id, session.participantId, session.teamMemberId, session._id, session.userId]
    .filter(Boolean)
    .forEach(id => ids.add(String(id)));

  const nestedParticipant = session.participant;
  if (nestedParticipant && typeof nestedParticipant === 'object') {
    const record = nestedParticipant as Record<string, unknown>;
    [record.id, record._id, record.participantId, record.participant_id]
      .filter(Boolean)
      .forEach(id => ids.add(String(id)));
  }

  if (options?.allowNetwork === false) {
    return [...ids];
  }

  // Skip expensive network lookups when session already has a resolved participant id.
  const hasResolvedRecordId = Boolean(session.participantId || session.id);
  if (hasResolvedRecordId && hasParticipantToken()) {
    return [...ids];
  }

  try {
    const profile = await getMyParticipantProfile();
    if (profile?.id) ids.add(String(profile.id));
  } catch {
    // ignore
  }

  return [...ids];
};
