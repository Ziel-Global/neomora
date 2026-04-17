import apiClient from './apiClient';
import { EMSEvent } from '@/lib/emsStore';

export interface SportCategoryPayload {
  id?: string | number;
  name: string;
  subCategory: string;
}

export interface CreateEventPayload {
  name: string;
  theme: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  city: string;
  eventType: string; // 'individual' | 'team-based' | 'hybrid'
  venues: string[];
  sportCategories: SportCategoryPayload[];
  status: string; // 'Draft' | 'Published' | etc.
}

export const getEvents = async (): Promise<EMSEvent[]> => {
  const { data } = await apiClient.get('/events');
  return data;
};

export const createEvent = async (payload: CreateEventPayload): Promise<EMSEvent> => {
  const { data } = await apiClient.post('/admin/events', payload);
  return data;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/events/${id}`);
};

export const updateEvent = async (id: string, payload: CreateEventPayload): Promise<EMSEvent> => {
  const { data } = await apiClient.put(`/admin/events/${id}`, payload);
  return data;
};
