/**
 * Client-side mirror of server socket event constants.
 * Kept in sync with server/src/socket/socketEvents.ts manually.
 */

export const SOCKET_EVENTS = {
  QUEUE_UPDATED: 'queue:updated',
  NOTIFICATION_NEW: 'notification:new',
  JOIN_SERVICE_ROOM: 'join:service-room',
  LEAVE_SERVICE_ROOM: 'leave:service-room',
} as const;

export interface QueueUpdatePayload {
  serviceId: string;
  organizationId: string;
  queueDate: string;
  eventType:
    | 'TOKEN_CALLED'
    | 'TOKEN_SERVING'
    | 'TOKEN_COMPLETED'
    | 'TOKEN_SKIPPED'
    | 'TOKEN_CANCELLED'
    | 'TOKEN_JOINED';
  tokenId: string;
  tokenCode: string;
  status: string;
  timestamp: string;
}
