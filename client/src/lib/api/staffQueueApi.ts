import { apiRequest } from '../api';
import type { QueueToken } from '../../types/queue';
import type { StaffQueueContext } from '../../types/staffQueue';

export const fetchStaffQueueContext = async (): Promise<StaffQueueContext> => {
  const response = await apiRequest<StaffQueueContext>('/api/staff/queue');
  return response.data!;
};

export const callNextToken = async (): Promise<QueueToken> => {
  const response = await apiRequest<QueueToken>('/api/staff/queue/call-next', {
    method: 'POST',
  });
  return response.data!;
};

export const startServingToken = async (tokenId: string): Promise<QueueToken> => {
  const response = await apiRequest<QueueToken>(`/api/staff/queue/${tokenId}/start`, {
    method: 'POST',
  });
  return response.data!;
};

export const completeToken = async (tokenId: string): Promise<QueueToken> => {
  const response = await apiRequest<QueueToken>(`/api/staff/queue/${tokenId}/complete`, {
    method: 'POST',
  });
  return response.data!;
};

export const skipToken = async (tokenId: string): Promise<QueueToken> => {
  const response = await apiRequest<QueueToken>(`/api/staff/queue/${tokenId}/skip`, {
    method: 'POST',
  });
  return response.data!;
};
