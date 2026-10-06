/**
 * Socket.IO event names and payload types for Phase 5.
 * Single source of truth — imported by server and can be mirrored on the client.
 */

export const SOCKET_EVENTS = {
  // Server → Client broadcasts
  QUEUE_UPDATED: 'queue:updated',
  NOTIFICATION_NEW: 'notification:new',

  // Client → Server room management
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

/**
 * Returns the room name for a given serviceId.
 * Centralised so client and server always use the same format.
 */
export const serviceRoom = (serviceId: string): string =>
  `queue:service:${serviceId}`;

/**
 * Returns the private notification room name for a given userId.
 */
export const userRoom = (userId: string): string =>
  `user:${userId}`;
