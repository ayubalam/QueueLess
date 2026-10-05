/**
 * useQueueSocket — reusable hook for subscribing to a service queue room.
 *
 * Handles:
 * - Joining the service room (authorised by server)
 * - Listening for queue:updated events
 * - Calling the provided onQueueUpdate callback to trigger a data refetch
 * - Cleaning up listeners on unmount / serviceId change
 * - NOT duplicating listeners even in React StrictMode (ref guard)
 */
import { useEffect, useRef } from 'react';
import { connectSocket } from '../lib/socket';
import { SOCKET_EVENTS } from '../lib/socketEvents';
import type { QueueUpdatePayload } from '../lib/socketEvents';

interface UseQueueSocketOptions {
  /** The service room to subscribe to. Pass null/undefined to skip. */
  serviceId: string | null | undefined;
  /** Called each time a queue:updated event is received for this service. */
  onQueueUpdate: (payload: QueueUpdatePayload) => void;
}

export const useQueueSocket = ({ serviceId, onQueueUpdate }: UseQueueSocketOptions): void => {
  const joinedRoomRef = useRef<string | null>(null);
  const onQueueUpdateRef = useRef(onQueueUpdate);

  // Keep the callback ref current so we don't need to re-subscribe when it changes
  useEffect(() => {
    onQueueUpdateRef.current = onQueueUpdate;
  }, [onQueueUpdate]);

  useEffect(() => {
    if (!serviceId) return;

    const socket = connectSocket();

    const handleQueueUpdate = (payload: QueueUpdatePayload) => {
      // Only process events for our subscribed service
      if (payload.serviceId === serviceId) {
        onQueueUpdateRef.current(payload);
      }
    };

    const joinRoom = () => {
      if (joinedRoomRef.current === serviceId) return; // already joined
      socket.emit(SOCKET_EVENTS.JOIN_SERVICE_ROOM, serviceId);
      joinedRoomRef.current = serviceId;
    };

    // Register update listener
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdate);

    // Join immediately if already connected, else on connect
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    return () => {
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdate);
      socket.off('connect', joinRoom);

      if (joinedRoomRef.current === serviceId) {
        socket.emit(SOCKET_EVENTS.LEAVE_SERVICE_ROOM, serviceId);
        joinedRoomRef.current = null;
      }
    };
  }, [serviceId]);
};
