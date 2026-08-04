import apiClient from './apiClient';

export interface EMSManager {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  country?: string;
  organization?: string;
  federation?: string;
  status?: string;
  createdAt?: string;
}

export interface CreateTeamManagerPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  country: string;
  organization: string;
  federation: string;
}

export interface InviteTeamManagerPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  organization: string;
  federation: string;
}

const unwrapList = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.managers)) return record.managers;
    if (Array.isArray(record.users)) return record.users;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.teamManagers)) return record.teamManagers;
  }
  return [];
};

const unwrapItem = (data: unknown): any => {
  if (!data || typeof data !== 'object') return data;
  const record = data as Record<string, unknown>;
  return record.data || record.manager || record.teamManager || record.user || data;
};

export const normalizeManager = (raw: any): EMSManager | null => {
  if (!raw || typeof raw !== 'object') return null;

  const email = String(raw.email || raw.user?.email || '').trim();
  const id = String(raw.id || raw._id || raw.userId || raw.user_id || raw.user?.id || raw.user?._id || '').trim();

  if (!email && !id) return null;

  return {
    id: id || `email:${email.toLowerCase()}`,
    firstName: raw.firstName || raw.first_name || raw.user?.firstName || raw.user?.first_name,
    lastName: raw.lastName || raw.last_name || raw.user?.lastName || raw.user?.last_name,
    name: raw.name || raw.user?.name,
    email,
    phone: raw.phone || raw.user?.phone,
    country: raw.country || raw.user?.country,
    organization: raw.organization || raw.federation || raw.user?.organization,
    federation: raw.federation || raw.user?.federation,
    status: raw.status || raw.user?.status,
    createdAt: raw.createdAt || raw.created_at,
  };
};

export const getManagerDisplayName = (
  manager: Pick<EMSManager, 'firstName' | 'lastName' | 'name' | 'email'>,
): string => {
  if (manager.firstName || manager.lastName) {
    return `${manager.firstName || ''} ${manager.lastName || ''}`.trim();
  }
  if (manager.name) return manager.name;
  return manager.email || 'Unknown Manager';
};

const dedupeManagers = (managers: EMSManager[]): EMSManager[] => {
  const byKey = new Map<string, EMSManager>();

  for (const manager of managers) {
    const key = manager.email?.toLowerCase() || manager.id;
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, manager);
      continue;
    }

    const existingHasRealId = existing.id && !existing.id.startsWith('email:');
    const nextHasRealId = manager.id && !manager.id.startsWith('email:');
    if (!existingHasRealId && nextHasRealId) {
      byKey.set(key, manager);
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    getManagerDisplayName(a).localeCompare(getManagerDisplayName(b)),
  );
};

const fetchManagersFromEndpoint = async (endpoint: string): Promise<EMSManager[]> => {
  const { data } = await apiClient.get(endpoint);
  return unwrapList(data)
    .map(normalizeManager)
    .filter(Boolean) as EMSManager[];
};

/** List team managers from the backend's admin listing endpoint. */
export const getAllManagers = async (): Promise<EMSManager[]> => {
  const managers = await fetchManagersFromEndpoint('/admin/managers');
  return dedupeManagers(managers);
};

/** Admin creates a team manager — POST /admin/team-managers */
export const createTeamManager = async (payload: CreateTeamManagerPayload): Promise<EMSManager> => {
  const body = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    confirmPassword: payload.confirmPassword,
    phone: payload.phone.trim(),
    country: payload.country.trim(),
    organization: payload.organization.trim(),
    federation: payload.federation.trim(),
  };

  const { data } = await apiClient.post('/admin/team-managers', body);
  const normalized = normalizeManager(unwrapItem(data));
  if (!normalized) {
    throw new Error('Manager created but response could not be parsed');
  }
  return normalized;
};

/** Admin invites a team manager by email — POST /admin/team-managers/invite */
export const inviteTeamManager = async (payload: InviteTeamManagerPayload): Promise<{ teamManager: EMSManager; setupEmailSent: boolean }> => {
  const body = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    country: payload.country.trim(),
    organization: payload.organization.trim(),
    federation: payload.federation.trim(),
  };

  const { data } = await apiClient.post('/admin/team-managers/invite', body);
  const normalized = normalizeManager(unwrapItem(data?.teamManager || data));
  if (!normalized) {
    throw new Error('Manager invited but response could not be parsed');
  }
  return { teamManager: normalized, setupEmailSent: data?.setupEmailSent !== false };
};

/** Resend a manager's password-setup invite — POST /admin/team-managers/:id/send-setup-email */
export const resendManagerSetupEmail = async (id: string): Promise<{ message: string }> => {
  const { data } = await apiClient.post(`/admin/team-managers/${id}/send-setup-email`);
  return data;
};

/** Admin deletes (soft) a team manager — DELETE /admin/team-managers/:id */
export const deleteTeamManager = async (id: string): Promise<{ message: string }> => {
  const { data } = await apiClient.delete(`/admin/team-managers/${id}`);
  return data;
};

/** @deprecated use getAllManagers */
export const getManagers = getAllManagers;
