import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../lib/validators/auth';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, error, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid or missing password reset token');
      return;
    }

    setIsSubmitting(true);
    clearError();
    try {
      await resetPassword(token, data.password, data.confirmPassword);
      setIsSuccess(true);
      toast.success('Password successfully reset!');
    } catch {
      // Error managed by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-lg shadow-blue-500/20 mb-4">
            QL
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">QueueLess</h1>
          <p className="text-sm text-slate-500 mt-1">Smart Queue Management System</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Set New Password</h2>
            <p className="text-xs text-slate-500 mt-1">Please enter your new strong password below</p>
          </div>

          {!token && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Missing Reset Token</p>
                <p className="text-xs mt-0.5 text-amber-600">
                  No valid reset token was found in the URL. Please request a new password reset link.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reset Failed</p>
                <p className="text-xs mt-0.5 text-red-500">{error}</p>
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-700 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Password Updated</p>
                  <p className="text-xs mt-1 text-emerald-600">
                    Your password has been reset successfully and existing sessions invalidated.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <span>Sign In with New Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full bg-slate-50 border ${
                      errors.password ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                    } rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className={`w-full bg-slate-50 border ${
                      errors.confirmPassword ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                    } rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
