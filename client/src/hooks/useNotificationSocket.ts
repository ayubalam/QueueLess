import { useEffect, useRef } from 'react';
import { connectSocket } from '../lib/socket';
import { SOCKET_EVENTS } from '../lib/socketEvents';
import { showBrowserNotification } from '../lib/browserNotifications';
import type { CustomerNotification } from '../types/notification';
import { toast } from 'sonner';

interface UseNotificationSocketOptions {
  onNotification?: (notification: CustomerNotification) => void;
}

/**
 * Hook to listen for private user notifications over the shared Socket.IO connection.
 * Shows in-app toasts and triggers optional browser notifications.
 */
export const useNotificationSocket = (options?: UseNotificationSocketOptions): void => {
  const onNotificationRef = useRef(options?.onNotification);

  useEffect(() => {
    onNotificationRef.current = options?.onNotification;
  }, [options?.onNotification]);

  useEffect(() => {
    const socket = connectSocket();

    const handleNewNotification = (notification: CustomerNotification) => {
      // 1. In-app toast feedback
      switch (notification.type) {
        case 'TOKEN_CALLED':
          toast.info(notification.title, {
            description: notification.message,
            duration: 8000,
          });
          break;
        case 'TOKEN_SERVING':
          toast.success(notification.title, {
            description: notification.message,
          });
          break;
        case 'TURN_APPROACHING':
          toast.warning(notification.title, {
            description: notification.message,
            duration: 7000,
          });
          break;
        case 'TOKEN_COMPLETED':
          toast.success(notification.title, {
            description: notification.message,
          });
          break;
        case 'TOKEN_SKIPPED':
        case 'TOKEN_CANCELLED':
          toast.error(notification.title, {
            description: notification.message,
          });
          break;
        default:
          toast.info(notification.title, {
            description: notification.message,
          });
      }

      // 2. Browser push notification (if user granted permission)
      showBrowserNotification(notification.title, {
        body: notification.message,
      });

      // 3. Callback to update state / unread counts
      if (onNotificationRef.current) {
        onNotificationRef.current(notification);
      }
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, []);
};
