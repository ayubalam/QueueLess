import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldAlert } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold">
            SA
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">QueueLess Super Admin Platform</h1>
            <p className="text-xs text-slate-500">System Admin: {user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
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
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200">
          <h2 className="text-xl font-bold text-slate-900">Super Admin System Control</h2>
          <p className="text-xs text-slate-600 mt-1">Global platform tenant management and administrative role provisioning.</p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 font-mono text-xs text-slate-700 shadow-xs">
          <p className="text-slate-400 font-sans text-xs font-semibold uppercase tracking-wider mb-2">Super Admin Session Info</p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      </main>
    </div>
  );
};
