/**
 * Browser notifications utility.
 * Safe, opt-in browser notification helper following modern web guidelines.
 */

export const isBrowserNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getBrowserNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Requests browser notification permission.
 * MUST only be invoked after explicit user interaction (e.g. clicking an enable button).
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[BrowserNotifications] Failed to request permission:', err);
    return Notification.permission;
  }
};

/**
 * Dispatches a native browser notification if permissions are granted.
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions
): boolean => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(title, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('[BrowserNotifications] Unable to show notification:', err);
    return false;
  }
};
