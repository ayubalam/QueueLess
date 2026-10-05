import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  User as UserIcon,
  Ticket,
  History,
  ShieldCheck,
  Building,
  Clock,
  MapPin,
  Phone,
  Search,
  Loader2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchOrganizations, fetchServices } from '../../lib/api/orgApi';
import { fetchMyActiveToken, joinQueue, cancelQueueToken } from '../../lib/api/queueApi';
import type { Organization, Service } from '../../types/organization';
import type { QueueToken } from '../../types/queue';
import { toast } from 'sonner';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { useSocketStatus } from '../../hooks/useSocketStatus';

export const CustomerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Active queue token state
  const [activeToken, setActiveToken] = useState<QueueToken | null>(null);
  const [joiningServiceId, setJoiningServiceId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Success modal when joining queue
  const [newlyJoinedToken, setNewlyJoinedToken] = useState<QueueToken | null>(null);

  const { connected, reconnecting } = useSocketStatus();

  const loadActiveToken = useCallback(async () => {
    try {
      const token = await fetchMyActiveToken();
      setActiveToken(token);
    } catch {
      // Non-critical background fetch failure
    }
  }, []);

  // Derive serviceId from active token for socket subscription
  const activeServiceId = activeToken
    ? (typeof activeToken.serviceId === 'object'
        ? (activeToken.serviceId as any)._id
        : activeToken.serviceId)
    : null;

  // Real-time queue updates: re-fetch from backend when any event fires in the room
  useQueueSocket({
    serviceId: activeServiceId,
    onQueueUpdate: useCallback(() => {
      loadActiveToken();
    }, [loadActiveToken]),
  });

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        setIsLoadingOrgs(true);
        const data = await fetchOrganizations();
        setOrganizations(data);
        if (data.length > 0) {
          setSelectedOrg(data[0]);
        }
      } catch (err: any) {
        toast.error('Failed to load active organizations');
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    loadOrgs();
    loadActiveToken();
  }, [loadActiveToken]);

  useEffect(() => {
    if (!selectedOrg) return;
    const loadServices = async () => {
      try {
        setIsLoadingServices(true);
        const data = await fetchServices(selectedOrg._id);
        setServices(data);
      } catch {
        toast.error('Failed to load services for this organization');
      } finally {
        setIsLoadingServices(false);
      }
    };
    loadServices();
  }, [selectedOrg]);

  const handleJoinQueue = async (service: Service) => {
    if (!selectedOrg) return;

    try {
      setJoiningServiceId(service._id);
      const token = await joinQueue({
        organizationId: selectedOrg._id,
        serviceId: service._id,
      });

      setActiveToken(token);
      setNewlyJoinedToken(token);
      toast.success(`Joined queue successfully! Your token is ${token.tokenCode}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to join queue');
    } finally {
      setJoiningServiceId(null);
    }
  };

  const handleCancelActiveToken = async () => {
    if (!activeToken) return;

    try {
      setIsCancelling(true);
      await cancelQueueToken(activeToken._id);
      toast.success('You have left the queue');
      setActiveToken(null);
      setShowCancelModal(false);
      if (newlyJoinedToken?._id === activeToken._id) {
        setNewlyJoinedToken(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave the queue');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const activeTokenOrgName =
    typeof activeToken?.organizationId === 'object'
      ? activeToken.organizationId.name
      : 'Organization';
  const activeTokenServiceName =
    typeof activeToken?.serviceId === 'object' ? activeToken.serviceId.name : 'Service';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            QL
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">QueueLess Customer Portal</h1>
            <p className="text-xs text-slate-500">Welcome, {user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Live connection indicator (only show when active token exists) */}
          {activeToken && (
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
          )}
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
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/my-token"
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-start space-y-3 shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Active Token</span>
                {activeToken && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    {activeToken.tokenCode}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeToken
                  ? `Position #${activeToken.position ?? 1} • ~${activeToken.estimatedWaitMinutes ?? 0}m wait`
                  : 'View your current queue position'}
              </p>
            </div>
          </Link>

          <Link
            to="/queue-history"
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-start space-y-3 shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Queue History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Check past completed tickets</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-start space-y-3 shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Profile & Contact</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage personal information</p>
            </div>
          </Link>
        </div>

        {/* Live Active Queue Card (if customer has an active token) */}
        {activeToken && (
          <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/60 border border-blue-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Your Active Queue
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(activeToken.status)}`}>
                      {activeToken.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeTokenOrgName} — <span className="text-blue-700">{activeTokenServiceName}</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/my-token"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors"
                >
                  Leave Queue
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Token</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block tracking-wider">
                  {activeToken.tokenCode}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Position</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                  #{activeToken.position ?? 1}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">People Ahead</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                  {activeToken.peopleAhead ?? 0}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Est. Wait</span>
                <span className="text-xl font-bold text-amber-700 mt-0.5 block">
                  ~{activeToken.estimatedWaitMinutes ?? 0}m
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Organization & Service Discovery Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Explore Active Organizations & Services
              </h2>
              <p className="text-xs text-slate-500">Browse service providers, check waiting times, and join queues</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {isLoadingOrgs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center p-8 space-y-2">
              <Building className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                {searchQuery ? 'No organizations match your search' : 'No active organizations yet'}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchQuery
                  ? 'Try a different search term or clear the search field.'
                  : 'Active service organizations will appear here once administrators set them up.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Organization List */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Active Providers ({filteredOrgs.length})
                </span>
                {filteredOrgs.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => setSelectedOrg(org)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedOrg?._id === org._id
                        ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{org.name}</p>
                    <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">{org.category}</span>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{org.address}</span>
                    </p>
                  </button>
                ))}
              </div>

              {/* Selected Org Services */}
              <div className="md:col-span-2 space-y-4">
                {selectedOrg && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">{selectedOrg.name}</h3>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                          {selectedOrg.category}
                        </span>
                      </div>
                      {selectedOrg.description && (
                        <p className="text-xs text-slate-600">{selectedOrg.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          {selectedOrg.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          {selectedOrg.phone}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                        Available Services
                      </span>

                      {isLoadingServices ? (
                        <div className="flex items-center justify-center p-6">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        </div>
                      ) : services.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                          No active services currently listed for this organization.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {services.map((srv) => {
                            const isThisServiceActive =
                              activeToken &&
                              (typeof activeToken.serviceId === 'object'
                                ? activeToken.serviceId._id === srv._id
                                : activeToken.serviceId === srv._id);

                            const isJoining = joiningServiceId === srv._id;

                            return (
                              <div
                                key={srv._id}
                                className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between shadow-xs"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <h4 className="text-xs font-bold text-slate-900">{srv.name}</h4>
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                                      Active
                                    </span>
                                  </div>
                                  {srv.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2">{srv.description}</p>
                                  )}
                                  <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium pt-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>~{srv.estimatedServiceTime} mins est. service time</span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100">
                                  {isThisServiceActive ? (
                                    <Link
                                      to="/my-token"
                                      className="w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                      <span>In Queue (Token {activeToken?.tokenCode})</span>
                                    </Link>
                                  ) : (
                                    <button
                                      onClick={() => handleJoinQueue(srv)}
                                      disabled={isJoining || !!joiningServiceId}
                                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                    >
                                      {isJoining ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>Joining Queue...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Ticket className="w-3.5 h-3.5" />
                                          <span>Join Queue</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Newly Joined Token Modal */}
      {newlyJoinedToken && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                Queue Entry Confirmed
              </span>
              <h3 className="text-base font-bold text-slate-900">Your Queue Token</h3>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-5 text-center space-y-1">
              <div className="text-4xl font-black text-slate-900 tracking-widest">
                {newlyJoinedToken.tokenCode}
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase inline-block mt-1 ${getStatusBadge(newlyJoinedToken.status)}`}>
                {newlyJoinedToken.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Position</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">#{newlyJoinedToken.position ?? 1}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ahead</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{newlyJoinedToken.peopleAhead ?? 0}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Est. Wait</span>
                <span className="text-sm font-bold text-amber-700 mt-0.5 block">~{newlyJoinedToken.estimatedWaitMinutes ?? 0}m</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewlyJoinedToken(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200"
              >
                Close
              </button>
              <Link
                to="/my-token"
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs text-center inline-flex items-center justify-center gap-1 shadow-xs"
              >
                <span>View Live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Active Token Confirmation Modal */}
      {showCancelModal && activeToken && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Leave Queue</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to cancel token <span className="font-semibold text-slate-900">{activeToken.tokenCode}</span>? You will forfeit your position in line.
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
                onClick={handleCancelActiveToken}
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
