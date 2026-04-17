import apiClient from './apiClient';
import { EMSParticipant } from '@/lib/emsStore';

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

export const getParticipants = async (): Promise<EMSParticipant[]> => {
  const { data } = await apiClient.get('/admin/participants');
  return data;
};

export const createParticipant = async (payload: ParticipantPayload): Promise<EMSParticipant> => {
  const { data } = await apiClient.post('/admin/participants', payload);
  return data;
};

export const updateParticipant = async (id: string, payload: Partial<ParticipantPayload>): Promise<EMSParticipant> => {
  const { data } = await apiClient.put(`/admin/participants/${id}`, payload);
  return data;
};

export const deleteParticipant = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/participants/${id}`);
};
