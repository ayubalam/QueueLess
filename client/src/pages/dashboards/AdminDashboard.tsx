import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  ShieldCheck,
  Building,
  Sliders,
  Users,
  Monitor,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchOrganizations,
  fetchServices,
  fetchCounters,
  fetchStaff,
} from '../../lib/api/orgApi';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    orgCount: 0,
    serviceCount: 0,
    counterCount: 0,
    staffCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setIsLoading(true);
        const orgs = await fetchOrganizations();
        let serviceCount = 0;
        let counterCount = 0;
        let staffCount = 0;

        if (orgs.length > 0) {
          const orgId = orgs[0]._id;
          const [services, counters, staff] = await Promise.all([
            fetchServices(orgId),
            fetchCounters(orgId),
            fetchStaff(orgId),
          ]);
          serviceCount = services.length;
          counterCount = counters.length;
          staffCount = staff.length;
        }

        setStats({
          orgCount: orgs.length,
          serviceCount,
          counterCount,
          staffCount,
        });
      } catch {
        // Fallback silently if no org exists yet
      } finally {
        setIsLoading(false);
      }
    };
    loadOverview();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold">
            OA
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">QueueLess Organization Admin Portal</h1>
            <p className="text-xs text-slate-400">Admin: {user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
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

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Organization & Service Management</h2>
            <p className="text-xs text-slate-300 mt-1">Configure your business profile, service catalog, counters, and staff assignments.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Organizations</span>
            <p className="text-xl font-bold text-amber-400">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stats.orgCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Active Services</span>
            <p className="text-xl font-bold text-amber-400">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stats.serviceCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Counters</span>
            <p className="text-xl font-bold text-amber-400">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stats.counterCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Staff Members</span>
            <p className="text-xl font-bold text-amber-400">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stats.staffCount}</p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/organization"
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Organization Profile</h3>
                <p className="text-xs text-slate-400">Manage business details, address, & contact</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          <Link
            to="/admin/services"
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Service Management</h3>
                <p className="text-xs text-slate-400">Configure queue services & processing times</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          <Link
            to="/admin/counters"
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Counter Setup</h3>
                <p className="text-xs text-slate-400">Manage physical service desks & locations</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          <Link
            to="/admin/staff"
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Staff Roster & Counters</h3>
                <p className="text-xs text-slate-400">Add staff accounts & assign to counters</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>
        </div>
      </main>
    </div>
  );
};
