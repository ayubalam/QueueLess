import { apiRequest } from '../api';
import type { PublicService, PublicQueueStatus } from '../../types/publicQueue';

/**
 * Fetch safe public information about a service and its organization.
 * Does not require authentication.
 */
export const fetchPublicServiceInfo = async (serviceId: string): Promise<PublicService> => {
  const res = await apiRequest<PublicService>(`/api/public/services/${serviceId}`, {
    method: 'GET',
    skipAuth: true,
  });
  if (!res.data) throw new Error(res.message || 'Service not found');
  return res.data;
};

/**
 * Fetch public queue status for today (Now Serving, Waiting Count, Next 5).
 * Does not require authentication.
 */
export const fetchPublicQueueStatus = async (serviceId: string): Promise<PublicQueueStatus> => {
  const res = await apiRequest<PublicQueueStatus>(`/api/public/queues/${serviceId}`, {
    method: 'GET',
    skipAuth: true,
  });
  if (!res.data) throw new Error(res.message || 'Queue status not found');
  return res.data;
};
