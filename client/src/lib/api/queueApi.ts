import { apiRequest } from '../api';
import type { QueueToken, JoinQueuePayload } from '../../types/queue';

/**
 * Join an active service queue
 * POST /api/queues/join
 */
export const joinQueue = async (payload: JoinQueuePayload): Promise<QueueToken> => {
  const res = await apiRequest<QueueToken>('/api/queues/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data!;
};

/**
 * Get customer's current active queue token
 * GET /api/queues/my-active
 */
export const fetchMyActiveToken = async (): Promise<QueueToken | null> => {
  const res = await apiRequest<QueueToken | null>('/api/queues/my-active');
  return res.data ?? null;
};

/**
 * Get details for a specific queue token
 * GET /api/queues/:id
 */
export const fetchQueueTokenById = async (id: string): Promise<QueueToken> => {
  const res = await apiRequest<QueueToken>(`/api/queues/${id}`);
  return res.data!;
};

/**
 * Cancel an active queue token
 * POST /api/queues/:id/cancel
 */
export const cancelQueueToken = async (id: string): Promise<QueueToken> => {
  const res = await apiRequest<QueueToken>(`/api/queues/${id}/cancel`, {
    method: 'POST',
  });
  return res.data!;
};

/**
 * Get customer's queue history
 * GET /api/queues/my-history
 */
export const fetchMyQueueHistory = async (): Promise<QueueToken[]> => {
  const res = await apiRequest<QueueToken[]>('/api/queues/my-history');
  return res.data ?? [];
};
