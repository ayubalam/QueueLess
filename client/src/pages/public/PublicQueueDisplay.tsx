import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  Building,
  RotateCw,
  AlertCircle,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  Bell,
  CheckCircle,
} from 'lucide-react';
import { fetchPublicQueueStatus } from '../../lib/api/publicQueueApi';
import type { PublicQueueStatus } from '../../types/publicQueue';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { useSocketStatus } from '../../hooks/useSocketStatus';

export const PublicQueueDisplay: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [status, setStatus] = useState<PublicQueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const { connected, reconnecting } = useSocketStatus();

  const loadStatus = useCallback(async (silent: boolean = false) => {
    if (!serviceId) return;
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data = await fetchPublicQueueStatus(serviceId);
      setStatus(data);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Unable to load public queue status');
      }
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Real-time Socket.IO subscription
  useQueueSocket({
    serviceId,
    onQueueUpdate: useCallback(() => {
      loadStatus(true);
    }, [loadStatus]),
  });

  // Fallback periodic refresh every 30 seconds (reliable for standing TV displays)
  useEffect(() => {
    const timer = setInterval(() => {
      loadStatus(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadStatus]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none">
      {/* Top Header Bar for Monitor/TV Display */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md tracking-wider">
            QL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                QueueLess Display System
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                reconnecting
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
                {reconnecting ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Reconnecting</>
                ) : connected ? (
                  <><Wifi className="w-3 h-3 text-emerald-600" /> Live Feed</>
                ) : (
                  <><WifiOff className="w-3 h-3" /> Offline</>
                )}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
              <Building className="w-5 h-5 text-slate-400" />
              {status?.organizationName || 'Service Provider'}
            </h1>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Service Queue
          </span>
          <span className="text-lg font-bold text-blue-700">
            {status?.serviceName || 'Loading...'}
          </span>
          <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* Main Display Body */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto flex flex-col justify-center">
        {isLoading && !status ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-4 shadow-sm my-auto">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <p className="text-base font-semibold text-slate-600">Connecting to queue display...</p>
          </div>
        ) : error && !status ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center space-y-4 shadow-sm my-auto max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Service Not Available</h2>
            <p className="text-sm text-slate-500">{error}</p>
            <button
              onClick={() => loadStatus()}
              className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Primary Left Block: Now Serving (2 cols on large screen) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border-2 border-blue-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center flex flex-col justify-center min-h-[420px] relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

                <div className="inline-flex items-center justify-center gap-2 mx-auto px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-widest mb-4">
                  <Bell className="w-4 h-4" />
                  <span>NOW SERVING</span>
                </div>

                {status?.currentServingToken ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="text-7xl sm:text-9xl font-black text-slate-900 tracking-wider font-mono">
                      {status.currentServingToken.tokenCode}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <span className={`px-4 py-1 rounded-full text-sm font-extrabold uppercase tracking-widest ${
                        status.currentServingToken.status === 'CALLED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {status.currentServingToken.status}
                      </span>
                      {status.currentServingToken.counterName && (
                        <span className="px-4 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-sm font-bold">
                          Counter: {status.currentServingToken.counterName}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-8">
                    <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <div className="text-3xl font-extrabold text-slate-700">
                      No Active Token
                    </div>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      All called tokens have completed, or staff has not called the next number yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Waiting Count & Next Tokens in Line */}
            <div className="space-y-6 flex flex-col justify-between">
              {/* Waiting Count Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Queue Waiting
                  </span>
                  <div className="text-4xl font-black text-slate-900 mt-1">
                    {status?.waitingCount ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Customers waiting in line
                  </span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-8 h-8" />
                </div>
              </div>

              {/* Next In Line Box */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Next in Line
                  </h3>
                  <span className="text-[11px] font-semibold text-blue-600">
                    Up to next 5
                  </span>
                </div>

                {status?.nextTokens && status.nextTokens.length > 0 ? (
                  <div className="space-y-2.5 flex-1 flex flex-col justify-around">
                    {status.nextTokens.map((t, idx) => (
                      <div
                        key={t.tokenCode}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xl font-black text-slate-900 font-mono tracking-wider">
                            {t.tokenCode}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Waiting
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <Users className="w-8 h-8 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">No additional tokens in line</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding for Monitor Displays */}
      <footer className="bg-white border-t border-slate-200 px-8 py-3 text-center text-xs text-slate-400 flex items-center justify-between">
        <span>Powered by <strong className="text-slate-600 font-bold">QueueLess</strong> Smart Queue Management</span>
        <span className="text-[11px]">Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </footer>
    </div>
  );
};
