import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, ArrowLeft, LogOut, ShieldCheck, Mail, Phone, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-emerald-600" />
              Profile & Contact Information
            </h1>
            <p className="text-xs text-slate-500">View your account profile details</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
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

      {/* Main Profile Info */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl border border-emerald-200">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.fullName}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Email Address
              </span>
              <p className="font-semibold text-slate-900">{user?.email}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Phone Number
              </span>
              <p className="font-semibold text-slate-900">{user?.phone || 'Not provided'}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Email Verification
              </span>
              <p className="font-semibold text-slate-900 flex items-center gap-1">
                {user?.isEmailVerified ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-amber-700 font-medium">Pending Verification</span>
                  </>
                )}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Account Status
              </span>
              <p className="font-semibold text-slate-900">
                {user?.isActive ? (
                  <span className="text-emerald-700 font-medium">Active Account</span>
                ) : (
                  <span className="text-rose-700 font-medium">Deactivated</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
