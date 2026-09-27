import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Ticket, History, PlusCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CustomerDashboard: React.FC = () => {
  const { user, logout } = useAuth();

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
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Ready to join a queue?</h2>
            <p className="text-xs text-slate-300 mt-1">Get live updates and track your position in line effortlessly.</p>
          </div>
          <Link
            to="/queue/join"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Join Queue (Placeholder)</span>
          </Link>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            to="/history"
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

      </main>
    </div>
  );
};
