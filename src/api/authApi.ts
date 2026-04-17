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
