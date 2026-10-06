import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  PlusCircle,
  Clock,
  Users,
  Building,
  RotateCw,
  AlertTriangle,
  Loader2,
  Calendar,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMyActiveToken, cancelQueueToken } from '../../lib/api/queueApi';
import type { QueueToken } from '../../types/queue';
import { toast } from 'sonner';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { useSocketStatus } from '../../hooks/useSocketStatus';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import type { QueueUpdatePayload } from '../../lib/socketEvents';

export const ActiveTokenPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [token, setToken] = useState<QueueToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { connected, reconnecting } = useSocketStatus();

  const loadActiveToken = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const activeToken = await fetchMyActiveToken();
      setToken(activeToken);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load active queue token');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActiveToken();
  }, [loadActiveToken]);

  // Derive serviceId from the current token for socket room subscription
  const serviceId = token
    ? (typeof token.serviceId === 'object' ? (token.serviceId as any)._id : token.serviceId)
    : null;

  // Real-time queue updates — refetch from backend (source of truth)
  const handleQueueUpdate = useCallback((payload: QueueUpdatePayload) => {
    // If this event concerns our token specifically, update status immediately
    if (payload.tokenId === token?._id) {
      setToken(prev => prev ? { ...prev, status: payload.status as QueueToken['status'] } : prev);
      if (payload.eventType === 'TOKEN_CALLED') {
        toast.info('🔔 Your number has been called! Please proceed to the counter.', { duration: 8000 });
      } else if (payload.eventType === 'TOKEN_SERVING') {
        toast.success('✅ You are now being served.');
      } else if (payload.eventType === 'TOKEN_COMPLETED') {
        toast.success('Service completed. Thank you!');
      }
    }
    // Any queue change (someone ahead completed/cancelled) → refetch for accurate position
    loadActiveToken(true);
  }, [token?._id, loadActiveToken]);

  useQueueSocket({ serviceId, onQueueUpdate: handleQueueUpdate });
  useNotificationSocket({
    onNotification: useCallback(() => {
      loadActiveToken(true);
    }, [loadActiveToken]),
  });

  const handleCancel = async () => {
    if (!token) return;

    try {
      setIsCancelling(true);
      await cancelQueueToken(token._id);
      toast.success('You have successfully left the queue');
      setShowCancelModal(false);
      setToken(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave the queue');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'CALLED':
        return 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
      case 'SERVING':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const orgName = typeof token?.organizationId === 'object' ? token.organizationId.name : 'Organization';
  const orgCategory = typeof token?.organizationId === 'object' ? token.organizationId.category : '';
  const serviceName = typeof token?.serviceId === 'object' ? token.serviceId.name : 'Service';

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
              <Ticket className="w-5 h-5 text-blue-600" />
              Active Queue Token
            </h1>
            <p className="text-xs text-slate-500">Track your current position and estimated waiting time</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live connection indicator */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            reconnecting
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            {reconnecting ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Reconnecting...</>
            ) : connected ? (
              <><Wifi className="w-3 h-3" /> Live</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Offline</>
            )}
          </span>

          <button
            onClick={() => loadActiveToken(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Refresh status"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <NotificationCenter />
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {user?.role}
          </span>
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-center">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Checking active queue token...</p>
          </div>
        ) : !token ? (
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Ticket className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">No Active Queue Token</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You are not currently in any queue. Join a service queue from an active organization to see your token and live position here.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/dashboard"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-all shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Browse Active Services</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-6 p-6">
            {/* Top Bar: Provider info & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">
                  {orgCategory || 'Organization'}
                </span>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  {orgName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">Service: <span className="font-semibold text-slate-900">{serviceName}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(token.status)}`}>
                  {token.status}
                </span>
              </div>
            </div>

            {/* Token Highlight Banner */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-6 text-center space-y-2">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">
                Your Queue Token
              </span>
              <div className="text-5xl font-black text-slate-900 tracking-widest py-1">
                {token.tokenCode}
              </div>
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined at {new Date(token.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Position */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Position
                </span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  #{token.position ?? 1}
                </span>
              </div>

              {/* People Ahead */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  Ahead
                </span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  {token.peopleAhead ?? 0}
                </span>
              </div>

              {/* Estimated Wait */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Est. Wait
                </span>
                <span className="text-xl font-bold text-amber-700 mt-1 block">
                  ~{token.estimatedWaitMinutes ?? 0}m
                </span>
              </div>
            </div>

            {/* Helper Message based on status */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 text-center">
              {token.status === 'WAITING' && (
                <span>Please keep this page open. Position updates automatically — no refresh needed.</span>
              )}
              {token.status === 'CALLED' && (
                <span className="text-blue-700 font-semibold">🔔 Your number has been called! Please proceed to the service desk.</span>
              )}
              {token.status === 'SERVING' && (
                <span className="text-emerald-700 font-semibold">✅ You are currently being served.</span>
              )}
            </div>

            {/* Action buttons */}
            {(token.status === 'WAITING' || token.status === 'CALLED') && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors"
                >
                  Leave / Cancel Queue
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && token && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Leave Queue</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to cancel token <span className="font-semibold text-slate-900">{token.tokenCode}</span>? You will forfeit your position in line.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200"
              >
                Keep My Place
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs"
              >
                {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
