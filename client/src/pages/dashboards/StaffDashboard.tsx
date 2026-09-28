import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();

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

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="p-6 rounded-2xl bg-purple-50 border border-purple-200">
          <h2 className="text-xl font-bold text-slate-900">Counter Control Panel Placeholder</h2>
          <p className="text-xs text-slate-600 mt-1">Staff counter operations and ticket calls belong to later phases.</p>
          <div className="mt-4 flex space-x-3">
            <Link
              to="/staff/queue"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-1.5"
            >
              <Users className="w-4 h-4" />
              <span>Counter Queue View (Placeholder)</span>
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 font-mono text-xs text-slate-700 shadow-xs">
          <p className="text-slate-400 font-sans text-xs font-semibold uppercase tracking-wider mb-2">Staff Session Info</p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      </main>
    </div>
  );
};
