import type { QueueToken } from './queue';
import type { Counter, Service, Organization } from './organization';

export interface StaffQueueStats {
  waiting: number;
  called: number;
  serving: number;
  completed: number;
  skipped: number;
}

export interface StaffQueueContext {
  organizationId: Organization | string;
  counter: Counter;
  service: Service;
  currentActiveToken: QueueToken | null;
  waitingQueue: QueueToken[];
  stats: StaffQueueStats;
}
