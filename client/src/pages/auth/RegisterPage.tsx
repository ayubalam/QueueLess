import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, Phone, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '../../lib/validators/auth';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export const RegisterPage: React.FC = () => {
  const { register: registerUser, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  const passwordValue = watch('password', '');

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(passwordValue);

  const getStrengthLabel = () => {
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (strengthScore <= 3) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    if (strengthScore === 4) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strengthInfo = getStrengthLabel();

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    clearError();
    try {
      await registerUser(data);
      toast.success('Account created successfully! Welcome to QueueLess.');
      navigate('/dashboard', { replace: true });
    } catch {
      // Error state managed by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-lg shadow-blue-500/20 mb-4">
            QL
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">QueueLess</h1>
          <p className="text-sm text-slate-500 mt-1">Smart Queue Management System</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Create Customer Account</h2>
            <p className="text-xs text-slate-500 mt-1">Register to manage your queue tokens and track live wait times</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Error</p>
                <p className="text-xs mt-0.5 text-red-500">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('fullName')}
                  className={`w-full bg-slate-50 border ${
                    errors.fullName ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                  } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.fullName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="john@example.com"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+15551234567"
                    {...register('phone')}
                    className={`w-full bg-slate-50 border ${
                      errors.phone ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                    } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
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

              {passwordValue && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Password Strength:</span>
                    <span className={`font-semibold ${strengthInfo.text}`}>{strengthInfo.label}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-full flex-1 transition-all duration-300 ${
                          strengthScore >= level ? strengthInfo.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
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

            <div className="pt-2">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-500">
                <input
                  type="checkbox"
                  {...register('termsAccepted')}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/20"
                />
                <span>
                  I agree to the <span className="text-slate-700 underline">Terms of Service</span> and{' '}
                  <span className="text-slate-700 underline">Privacy Policy</span>.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.termsAccepted.message}</p>
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-500 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
