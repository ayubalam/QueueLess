import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { History, ArrowLeft, LogOut, ShieldCheck, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QueueHistoryPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Queue History
            </h1>
            <p className="text-xs text-slate-400">Review your past completed queue tickets</p>
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

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">No Queue History</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't completed any queue tickets yet. Your past served tickets and transaction details will appear here.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs inline-flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Browse Active Organizations</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
