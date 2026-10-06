import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  Users,
  Ticket,
  MapPin,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
  LogIn,
  UserPlus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { fetchPublicServiceInfo, fetchPublicQueueStatus } from '../../lib/api/publicQueueApi';
import { fetchMyActiveToken, joinQueue } from '../../lib/api/queueApi';
import type { PublicService, PublicQueueStatus } from '../../types/publicQueue';
import type { QueueToken } from '../../types/queue';
import { toast } from 'sonner';

export const CustomerJoinPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState<PublicService | null>(null);
  const [queueStatus, setQueueStatus] = useState<PublicQueueStatus | null>(null);
  const [existingActiveToken, setExistingActiveToken] = useState<QueueToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [svc, qStatus] = await Promise.all([
          fetchPublicServiceInfo(serviceId),
          fetchPublicQueueStatus(serviceId).catch(() => null),
        ]);

        setService(svc);
        setQueueStatus(qStatus);

        // If authenticated as customer, check if already in queue
        if (user && user.role === 'customer') {
          try {
            const myToken = await fetchMyActiveToken();
            if (myToken) {
              const activeSvcId =
                typeof myToken.serviceId === 'object'
                  ? (myToken.serviceId as any)._id
                  : myToken.serviceId;
              if (activeSvcId === serviceId) {
                setExistingActiveToken(myToken);
              }
            }
          } catch {
            // Non-critical check failure
          }
        }
      } catch (err: any) {
        setError(err.message || 'Service not found or is currently unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [serviceId, user]);

  const handleJoinQueue = async () => {
    if (!service) return;

    if (!user) {
      // Preserve return URL
      navigate(`/login?redirect=${encodeURIComponent(`/join/${service.serviceId}`)}`);
      return;
    }

    if (user.role !== 'customer') {
      toast.error('Only customer accounts can join queues');
      return;
    }

    try {
      setIsJoining(true);
      const token = await joinQueue({
        organizationId: service.organizationId,
        serviceId: service.serviceId,
      });

      toast.success(`Joined queue successfully! Your token is ${token.tokenCode}`);
      navigate('/my-token');
    } catch (err: any) {
      toast.error(err.message || 'Failed to join the queue');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs max-w-sm w-full">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading service information...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-sm max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Service Not Available</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'The requested service could not be found or is currently inactive.'}
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Go to Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            QL
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">
              QueueLess
            </span>
            <span className="text-xs font-bold text-slate-900">Smart Queue Check-in</span>
          </div>
        </div>

        {user ? (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-600 hidden sm:inline">Signed in as <strong>{user.fullName}</strong></span>
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1"
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              to={`/login?redirect=${encodeURIComponent(`/join/${service.serviceId}`)}`}
              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-6 flex flex-col justify-center my-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Organization & Service Header */}
          <div className="space-y-1 text-center border-b border-slate-100 pb-5">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
              {service.organizationName}
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {service.name}
            </h1>
            {service.description && (
              <p className="text-xs text-slate-500 max-w-sm mx-auto pt-1 leading-relaxed">
                {service.description}
              </p>
            )}
          </div>

          {/* Service Snapshot Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Est. Service
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                ~{service.estimatedServiceTime}m
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Waiting Now
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {queueStatus?.waitingCount ?? 0}
              </span>
            </div>
          </div>

          {/* Location details */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{service.organizationAddress}</span>
            </div>
            {service.organizationPhone && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{service.organizationPhone}</span>
              </div>
            )}
          </div>

          {/* Action Area based on user state */}
          {existingActiveToken ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>You are already in this queue</span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono tracking-wider">
                {existingActiveToken.tokenCode}
              </div>
              <p className="text-xs text-slate-600">
                Position #{existingActiveToken.position ?? 1} • ~{existingActiveToken.estimatedWaitMinutes ?? 0}m wait
              </p>
              <Link
                to="/my-token"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>View My Active Token</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : user && user.role !== 'customer' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Staff / Admin Account</span>
              </div>
              <p className="text-xs text-amber-700">
                You are currently signed in with a <strong>{user.role}</strong> account. Only customer accounts can join service queues.
              </p>
              <Link
                to="/dashboard"
                className="inline-block mt-1 text-xs font-semibold text-amber-900 underline"
              >
                Return to your dashboard
              </Link>
            </div>
          ) : user && user.role === 'customer' ? (
            <div className="space-y-3">
              <button
                onClick={handleJoinQueue}
                disabled={isJoining}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl shadow-sm inline-flex items-center justify-center gap-2 transition-all"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Getting Your Token...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Join Queue Now</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400">
                By joining, you will receive a digital ticket with live queue tracking.
              </p>
            </div>
          ) : (
            /* Unauthenticated user */
            <div className="space-y-3">
              <div className="text-center pb-1">
                <span className="text-xs font-semibold text-slate-700 block">
                  Sign in or create an account to get your token
                </span>
                <span className="text-[11px] text-slate-400">
                  Takes less than a minute. Your ticket will be linked to your account.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/login?redirect=${encodeURIComponent(`/join/${service.serviceId}`)}`}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl text-center inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to={`/register?redirect=${encodeURIComponent(`/join/${service.serviceId}`)}`}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl text-center inline-flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            </div>
          )}

          {/* Quick link to public monitor */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <Link
              to={`/public/queue/${service.serviceId}`}
              className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>View Live Public Display</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        QueueLess &copy; {new Date().getFullYear()} &bull; No more standing in line
      </footer>
    </div>
  );
};
