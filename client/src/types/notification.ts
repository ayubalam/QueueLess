export type NotificationType =
  | 'TOKEN_CALLED'
  | 'TOKEN_SERVING'
  | 'TOKEN_COMPLETED'
  | 'TOKEN_SKIPPED'
  | 'TOKEN_CANCELLED'
  | 'TURN_APPROACHING'
  | 'QUEUE_UPDATE';

export interface CustomerNotification {
  _id: string;
  userId: string;
  organizationId: string | { _id: string; name: string };
  serviceId: string | { _id: string; name: string };
  tokenId?: string | { _id: string; tokenCode: string; tokenNumber: number; status: string };
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsResponse {
  notifications: CustomerNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
