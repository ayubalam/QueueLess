import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchOrganizations, fetchServices } from '../../lib/api/orgApi';
import type { Organization, Service } from '../../types/organization';
import { toast } from 'sonner';

export const CustomerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

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
  }, []);

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

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
            QL
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">QueueLess Customer Portal</h1>
            <p className="text-xs text-slate-400">Welcome, {user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {user?.role}
          </span>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-medium"
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
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col items-start space-y-3"
          >
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Active Token</h3>
              <p className="text-xs text-slate-400 mt-0.5">View your current queue position</p>
            </div>
          </Link>

          <Link
            to="/queue-history"
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col items-start space-y-3"
          >
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Queue History</h3>
              <p className="text-xs text-slate-400 mt-0.5">Check past completed tickets</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col items-start space-y-3"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Profile & Contact</h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage personal information</p>
            </div>
          </Link>
        </div>

        {/* Organization & Service Discovery Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" />
                Explore Active Organizations & Services
              </h2>
              <p className="text-xs text-slate-400">Browse service providers and expected processing times</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {isLoadingOrgs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center p-8 space-y-2">
              <Building className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
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
                        ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{org.name}</p>
                    <span className="text-[10px] text-blue-400 font-medium block mt-0.5">{org.category}</span>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{org.address}</span>
                    </p>
                  </button>
                ))}
              </div>

              {/* Selected Org Services */}
              <div className="md:col-span-2 space-y-4">
                {selectedOrg && (
                  <>
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{selectedOrg.name}</h3>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                          {selectedOrg.category}
                        </span>
                      </div>
                      {selectedOrg.description && (
                        <p className="text-xs text-slate-300">{selectedOrg.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          {selectedOrg.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-400" />
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
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                      ) : services.length === 0 ? (
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                          No active services currently listed for this organization.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {services.map((srv) => (
                            <div
                              key={srv._id}
                              className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-start justify-between">
                                <h4 className="text-xs font-bold text-white">{srv.name}</h4>
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                                  Active
                                </span>
                              </div>
                              {srv.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">{srv.description}</p>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium pt-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>~{srv.estimatedServiceTime} mins est. service time</span>
                              </div>
                            </div>
                          ))}
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
    </div>
  );
};
