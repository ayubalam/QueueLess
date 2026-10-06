export interface PublicService {
  serviceId: string;
  name: string;
  description?: string;
  estimatedServiceTime: number;
  organizationId: string;
  organizationName: string;
  organizationAddress: string;
  organizationPhone: string;
  organizationEmail: string;
  isActive: boolean;
}

export interface PublicQueueToken {
  tokenCode: string;
  tokenNumber: number;
  status: 'WAITING' | 'CALLED' | 'SERVING';
  counterName?: string | null;
}

export interface PublicQueueStatus {
  serviceId: string;
  organizationId: string;
  serviceName: string;
  organizationName: string;
  currentServingToken: PublicQueueToken | null;
  currentServingStatus: 'CALLED' | 'SERVING' | null;
  waitingCount: number;
  nextTokens: PublicQueueToken[];
  lastUpdated: string;
  queueDate: string;
}
