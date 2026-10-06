import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Check,
  Clock,
  Ticket,
  Play,
  CheckCircle2,
  SkipForward,
  XCircle,
  Volume2,
  VolumeX,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getNotifications,
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

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(
    getBrowserNotificationPermission()
  );

  const loadData = useCallback(async (p: number = 1) => {
    try {
      setIsLoading(true);
      const res = await getNotifications(p, 15);
      setNotifications(res.notifications);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  // Real-time listener: prepend new notification
  useNotificationSocket({
    onNotification: useCallback((newNotif: CustomerNotification) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setTotal((prev) => prev + 1);
    }, []),
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
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
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleToggleBrowserAlerts = async () => {
    const result = await requestNotificationPermission();
    setBrowserPermission(result);
    if (result === 'granted') {
      toast.success('Browser notifications enabled!');
    } else if (result === 'denied') {
      toast.error('Browser notifications were blocked. Please enable them in browser settings.');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'TOKEN_CALLED':
        return <Ticket className="w-5 h-5 text-blue-600" />;
      case 'TOKEN_SERVING':
        return <Play className="w-5 h-5 text-emerald-600" />;
      case 'TURN_APPROACHING':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'TOKEN_COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'TOKEN_SKIPPED':
        return <SkipForward className="w-5 h-5 text-rose-600" />;
      case 'TOKEN_CANCELLED':
        return <XCircle className="w-5 h-5 text-slate-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Notifications & Alerts
            </h1>
            <p className="text-xs text-slate-500">Live queue alerts and status change updates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBrowserNotificationSupported() && (
            <button
              type="button"
              onClick={handleToggleBrowserAlerts}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border ${
                browserPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Browser alert permissions"
            >
              {browserPermission === 'granted' ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Browser Alerts On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Enable Browser Alerts</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={notifications.every((n) => n.isRead)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              All ({total})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'unread' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Unread
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Account: <strong>{user?.fullName}</strong>
          </span>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No notifications yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When you join a queue, you will receive real-time notifications here when your turn is near, called, or completed.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((n) => (
              <div
                key={n._id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 shadow-xs ${
                  !n.isRead
                    ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60 text-[11px] text-slate-400">
                    <span>
                      Type: <strong className="font-semibold text-slate-600">{n.type.replace('_', ' ')}</strong>
                    </span>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n._id)}
                        className="text-blue-600 hover:text-blue-700 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
