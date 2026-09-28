import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../lib/validators/auth';
import { useAuth } from '../../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    clearError();
    try {
      const generatedDevToken = await forgotPassword(data.email);
      setIsSuccess(true);
      if (generatedDevToken) {
        setDevToken(generatedDevToken);
      }
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
            <h2 className="text-xl font-bold text-slate-900">Reset Your Password</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered email address and we will send password reset instructions
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-xs mt-0.5 text-red-500">{error}</p>
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-700 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Reset Instructions Generated</p>
                  <p className="text-xs mt-1 text-emerald-600">
                    If an account is associated with this email, password reset instructions have been generated safely.
                  </p>
                </div>
              </div>

              {devToken && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center space-x-2 font-semibold text-amber-700">
                    <Terminal className="w-4 h-4" />
                    <span>Development Environment Mode</span>
                  </div>
                  <p className="text-amber-700 font-sans">
                    Since live SMTP credentials are not configured, use this development reset link:
                  </p>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    className="block p-2 rounded bg-amber-100 text-amber-900 hover:underline break-all font-semibold"
                  >
                    /reset-password?token={devToken}
                  </Link>
                </div>
              )}

              <Link
                to="/login"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    {...register('email')}
                    className={`w-full bg-slate-50 border ${
                      errors.email ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                    } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
