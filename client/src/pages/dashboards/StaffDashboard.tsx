import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck, Users, Play, CheckCircle2, SkipForward, RefreshCw, Clock, Wifi, WifiOff, Loader2 as Loader } from 'lucide-react';
import { fetchStaffQueueContext, callNextToken, startServingToken, completeToken, skipToken } from '../../lib/api/staffQueueApi';
import type { StaffQueueContext } from '../../types/staffQueue';
import { toast } from 'sonner';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { useSocketStatus } from '../../hooks/useSocketStatus';

export const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [context, setContext] = useState<StaffQueueContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connected, reconnecting } = useSocketStatus();

  const loadQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchStaffQueueContext();
      setContext(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue context');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Derive serviceId from context for socket room subscription
  const serviceId = context?.service
    ? (typeof context.service === 'object' ? (context.service as any)._id : context.service)
    : null;

  // When any queue event fires in the service room, reload queue state
  useQueueSocket({
    serviceId,
    onQueueUpdate: useCallback(() => {
      // Only auto-refresh if not currently mid-operation (avoids race conditions)
      if (!isOperating) loadQueue();
    }, [loadQueue, isOperating]),
  });

  const handleCallNext = async () => {
    try {
      setIsOperating(true);
      await callNextToken();
      toast.success('Called next token successfully');
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to call next token');
    } finally {
      setIsOperating(false);
    }
  };

  const handleStartServing = async (tokenId: string) => {
    try {
      setIsOperating(true);
      await startServingToken(tokenId);
      toast.success('Started serving token');
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start serving');
    } finally {
      setIsOperating(false);
    }
  };

  const handleComplete = async (tokenId: string) => {
    try {
      setIsOperating(true);
      await completeToken(tokenId);
      toast.success('Token completed');
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete token');
    } finally {
      setIsOperating(false);
    }
  };

  const handleSkip = async (tokenId: string) => {
    if (!window.confirm('Are you sure you want to skip this token?')) return;
    try {
      setIsOperating(true);
      await skipToken(tokenId);
      toast.success('Token skipped');
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to skip token');
    } finally {
      setIsOperating(false);
    }
  };

  if (isLoading && !context) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
          <p className="text-slate-600 text-sm mb-6">{error || 'Unable to load counter context'}</p>
          <button
            onClick={logout}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const { counter, service, currentActiveToken, waitingQueue, stats } = context;
  const isCallDisabled = isOperating || !!currentActiveToken || waitingQueue.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
            ST
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">QueueLess Staff Counter Portal</h1>
            <p className="text-xs text-slate-500">Operator: {user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Live connection indicator */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            reconnecting
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            {reconnecting ? (
              <><Loader className="w-3 h-3 animate-spin" /> Reconnecting...</>
            ) : connected ? (
              <><Wifi className="w-3 h-3" /> Live</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Offline</>
            )}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-700">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {user?.role}
          </span>
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Counter Info & Active Token */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Counter Info</h2>
              <button
                onClick={loadQueue}
                disabled={isLoading || isOperating}
                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">Counter</span>
                <span className="font-semibold text-slate-900">{counter.name}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-slate-900">{service.name}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">Completed Today</span>
                <span className="font-semibold text-purple-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Skipped Today</span>
                <span className="font-semibold text-slate-700">{stats.skipped}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Current Serving</h2>
            
            {currentActiveToken ? (
              <div className="text-center w-full">
                <div className="text-5xl font-extrabold text-purple-600 mb-2">
                  {currentActiveToken.tokenCode}
                </div>
                <div className="text-sm font-semibold text-slate-700 mb-8">
                  Status: <span className={currentActiveToken.status === 'SERVING' ? 'text-emerald-600' : 'text-amber-500'}>{currentActiveToken.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {currentActiveToken.status === 'CALLED' && (
                    <button
                      onClick={() => handleStartServing(currentActiveToken._id)}
                      disabled={isOperating}
                      className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-5 h-5" />
                      <span>Start Serving</span>
                    </button>
                  )}
                  {currentActiveToken.status === 'SERVING' && (
                    <button
                      onClick={() => handleComplete(currentActiveToken._id)}
                      disabled={isOperating}
                      className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Complete</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleSkip(currentActiveToken._id)}
                    disabled={isOperating}
                    className="col-span-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip Token</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium mb-8">No active token</p>
                <button
                  onClick={handleCallNext}
                  disabled={isCallDisabled}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/20"
                >
                  <Users className="w-5 h-5" />
                  <span>Call Next Token</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Waiting Queue */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Waiting Queue</h2>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                {waitingQueue.length} Waiting
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {waitingQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-12">
                  <Clock className="w-10 h-10 opacity-20" />
                  <p>The queue is currently empty.</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {waitingQueue.map((token, index) => (
                    <div key={token._id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 transition-colors bg-white">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{token.tokenCode}</p>
                          <p className="text-xs text-slate-500">Joined at {new Date(token.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right mr-4">
                          <p className="text-xs font-semibold text-slate-700">~{token.estimatedWaitMinutes} min</p>
                          <p className="text-[10px] text-slate-400 uppercase">Est. Wait</p>
                        </div>
                        {!currentActiveToken && index === 0 && (
                          <button
                            onClick={handleCallNext}
                            disabled={isOperating}
                            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            Call
                          </button>
                        )}
                        <button
                          onClick={() => handleSkip(token._id)}
                          disabled={isOperating}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Skip Token"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
