import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck, Building, Sliders, Users, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

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
        <div className="p-6 rounded-2xl bg-amber-900/20 border border-amber-500/20">
          <h2 className="text-xl font-bold text-white">Organization Management Placeholder</h2>
          <p className="text-xs text-slate-300 mt-1">Services, Counters, Staff, and Analytics belong to Phase 2+.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link to="/admin/organization" className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 text-xs font-semibold flex items-center space-x-2">
            <Building className="w-4 h-4 text-amber-400" />
            <span>Organization Config</span>
          </Link>
          <Link to="/admin/services" className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 text-xs font-semibold flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Services Config</span>
          </Link>
          <Link to="/admin/staff" className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 text-xs font-semibold flex items-center space-x-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Staff Roster</span>
          </Link>
          <Link to="/admin/analytics" className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 text-xs font-semibold flex items-center space-x-2">
            <BarChart className="w-4 h-4 text-amber-400" />
            <span>Queue Analytics</span>
          </Link>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
          <p className="text-slate-500 font-sans text-xs font-semibold uppercase tracking-wider mb-2">Org Admin Session</p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      </main>
    </div>
  );
};
