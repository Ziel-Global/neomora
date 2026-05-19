import apiClient from './apiClient';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    [key: string]: unknown;
  };
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
  return data;
};

export const participantLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/participant/login', { email, password });
  return data;
};

export const teamManagerRegister = async (
  payload: TeamManagerRegisterRequest
): Promise<{ message: string;[key: string]: unknown }> => {
  const { data } = await apiClient.post('/auth/team-manager/register', payload);
  return data;
};
