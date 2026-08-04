import apiClient from './apiClient';

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    participantId?: string;
    participant_id?: string;
    participant?: { id?: string; _id?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  participant?: { id?: string; _id?: string; email?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface TeamManagerRegisterRequest {
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

export const adminLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/admin/login', { email, password });
  return data;
};

export const teamManagerLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/team-manager/login', { email, password });
  const token = data?.token || data?.accessToken || data?.access_token || data?.data?.token;
  const user = data?.user || data?.profile || data?.data?.user || data;

  return {
    ...data,
    token,
    user,
  };
};

export const participantLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/participant/login', { email, password });
  const token = data?.token || data?.accessToken || data?.access_token;
  const user = data?.user || data?.profile || data;
  const participant = data?.participant || user?.participant || null;

  return {
    ...data,
    token,
    user: participant && typeof participant === 'object'
      ? { ...user, participant, participantId: participant.id || participant._id || user?.participantId }
      : user,
    participant,
  };
};

export const teamManagerRegister = async (
  payload: TeamManagerRegisterRequest
): Promise<{ message: string;[key: string]: unknown }> => {
  const { data } = await apiClient.post('/auth/team-manager/register', payload);
  return data;
};

export const subadminLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/Subadmin/login', { email, password });
  return data;
};

export interface ParticipantRegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SetParticipantPasswordResponse {
  message: string;
  email: string;
}

export const participantRegister = async (
  payload: ParticipantRegisterRequest
): Promise<{ message: string;[key: string]: unknown }> => {
  const { data } = await apiClient.post('/auth/participant/register', payload);
  return data;
};

export const setParticipantPassword = async (
  token: string,
  password: string,
  confirmPassword: string,
): Promise<SetParticipantPasswordResponse> => {
  const { data } = await apiClient.post('/auth/participant/set-password', {
    token,
    password,
    confirmPassword,
  });
  return data;
};

export const setManagerPassword = async (
  token: string,
  password: string,
  confirmPassword: string,
): Promise<SetParticipantPasswordResponse> => {
  const { data } = await apiClient.post('/auth/team-manager/set-password', {
    token,
    password,
    confirmPassword,
  });
  return data;
};
