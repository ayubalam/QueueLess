import { apiRequest } from '../api';
import type { CustomerNotification, NotificationsResponse } from '../../types/notification';

/**
 * Fetch paginated notifications for the current authenticated customer.
 */
export const getNotifications = async (
  page: number = 1,
  limit: number = 20
): Promise<NotificationsResponse> => {
  const res = await apiRequest<NotificationsResponse>(
    `/api/notifications?page=${page}&limit=${limit}`,
    {
      method: 'GET',
    }
  );
  if (!res.data) throw new Error(res.message || 'Failed to fetch notifications');
  return res.data;
};

/**
 * Get total unread notifications count for the current user.
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const res = await apiRequest<{ unreadCount: number }>('/api/notifications/unread-count', {
    method: 'GET',
  });
  return res.data?.unreadCount ?? 0;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (id: string): Promise<CustomerNotification> => {
  const res = await apiRequest<CustomerNotification>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!res.data) throw new Error(res.message || 'Failed to mark notification as read');
  return res.data;
};

/**
 * Mark all unread notifications as read.
 */
export const markAllNotificationsRead = async (): Promise<number> => {
  const res = await apiRequest<{ modifiedCount: number }>('/api/notifications/read-all', {
    method: 'PATCH',
  });
  return res.data?.modifiedCount ?? 0;
};
