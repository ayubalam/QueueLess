import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  PlusCircle,
  Building,
  Calendar,
  Clock,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMyQueueHistory } from '../../lib/api/queueApi';
import type { QueueToken } from '../../types/queue';
import { toast } from 'sonner';

export const QueueHistoryPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [history, setHistory] = useState<QueueToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const data = await fetchMyQueueHistory();
      setHistory(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load queue history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'CALLED':
        return 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
      case 'SERVING':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'COMPLETED':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'SKIPPED':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

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
              <History className="w-5 h-5 text-indigo-600" />
              Queue History
            </h1>
            <p className="text-xs text-slate-500">Review your past queue visits and ticket statuses</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadHistory(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Refresh history"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading queue history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4 max-w-md mx-auto my-12 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <History className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">No Queue History Yet</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You haven't joined or completed any queue tickets yet. When you take a token, records will appear here.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/dashboard"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-all shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Browse Active Organizations</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Past Visits ({history.length})</span>
              <span>Sorted by recent</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {history.map((item) => {
                const orgName = typeof item.organizationId === 'object' ? item.organizationId.name : 'Organization';
                const serviceName = typeof item.serviceId === 'object' ? item.serviceId.name : 'Service';

                return (
                  <div
                    key={item._id}
                    className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3 hover:border-slate-300 hover:shadow-sm shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[70px]">
                          <span className="text-base font-black text-slate-900 tracking-wider block">
                            {item.tokenCode}
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold block uppercase">
                            #{item.tokenNumber}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {orgName}
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Service: <span className="font-semibold text-slate-900">{serviceName}</span>
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Date: {item.queueDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Joined: {new Date(item.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.completedAt && (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          Completed: {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {item.cancelledAt && (
                        <span className="flex items-center gap-1 text-rose-700 font-medium">
                          Cancelled: {new Date(item.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
