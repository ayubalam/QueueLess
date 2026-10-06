import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Ticket,
  Play,
  CheckCircle2,
  SkipForward,
  XCircle,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../lib/api/notificationApi';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestNotificationPermission,
} from '../../lib/browserNotifications';
import type { CustomerNotification, NotificationType } from '../../types/notification';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import { toast } from 'sonner';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(
    getBrowserNotificationPermission()
  );

  const panelRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Non-critical
    }
  }, []);

  const loadRecentNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getNotifications(1, 10);
      setNotifications(res.notifications);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      loadRecentNotifications();
    }
  }, [isOpen, loadRecentNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Real-time socket notification listener
  useNotificationSocket({
    onNotification: useCallback((newNotif: CustomerNotification) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [newNotif, ...prev.slice(0, 9)]);
    }, []),
  });

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleEnableBrowserAlerts = async () => {
    const result = await requestNotificationPermission();
    setBrowserPermission(result);
    if (result === 'granted') {
      toast.success('Browser notifications enabled!');
    } else if (result === 'denied') {
      toast.error('Browser notifications were blocked in your browser settings.');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'TOKEN_CALLED':
        return <Ticket className="w-4 h-4 text-blue-600" />;
      case 'TOKEN_SERVING':
        return <Play className="w-4 h-4 text-emerald-600" />;
      case 'TURN_APPROACHING':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'TOKEN_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'TOKEN_SKIPPED':
        return <SkipForward className="w-4 h-4 text-rose-600" />;
      case 'TOKEN_CANCELLED':
        return <XCircle className="w-4 h-4 text-slate-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-in fade-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Optional Browser Notification Enable Banner */}
          {isBrowserNotificationSupported() && browserPermission === 'default' && (
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px]">Enable browser alerts when called</span>
              </div>
              <button
                type="button"
                onClick={handleEnableBrowserAlerts}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors shrink-0"
              >
                Enable
              </button>
            </div>
          )}

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5 stroke-1" />
                </div>
                <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                <p className="text-[11px] text-slate-400">You will receive updates when your queue status changes.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-3.5 hover:bg-slate-50/80 transition-colors flex items-start gap-3 ${
                    !n.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/60">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n._id, e)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
