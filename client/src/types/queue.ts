import type { Organization, Service, Counter } from './organization';

export type QueueTokenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export interface QueueToken {
  _id: string;
  organizationId: Organization | string;
  serviceId: Service | string;
  customerId: string;
  counterId?: Counter | string | null;
  tokenNumber: number;
  tokenCode: string;
  queueDate: string;
  status: QueueTokenStatus;
  joinedAt: string;
  calledAt?: string;
  servingStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  estimatedWaitMinutes: number;
  position?: number;
  peopleAhead?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JoinQueuePayload {
  organizationId: string;
  serviceId: string;
}
