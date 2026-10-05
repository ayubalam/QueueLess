import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types/auth';
import { apiRequest, setAccessToken } from '../lib/api';
import type { LoginFormData, RegisterFormData } from '../lib/validators/auth';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | undefined>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const refreshRes = await apiRequest<{ accessToken: string; user: User }>('/api/auth/refresh', {
        method: 'POST',
        skipAuth: true,
      });

      if (refreshRes.success && refreshRes.data) {
        setAccessToken(refreshRes.data.accessToken);
        setUser(refreshRes.data.user);
        // Connect socket now that we have a valid token
        connectSocket();
      }
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (data: LoginFormData) => {
    setError(null);
    try {
      const res = await apiRequest<{ user: User; accessToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.email, password: data.password }),
        skipAuth: true,
      });

      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        // Connect socket after successful login
        connectSocket();
      }
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'Login failed. Please try again.';
      setError(msg);
      throw err;
    }
  };

  const register = async (data: RegisterFormData) => {
    setError(null);
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
        skipAuth: true,
      });

      if (res.success) {
        await login({ email: data.email, password: data.password });
      }
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'Registration failed.';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout API network errors
    } finally {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
    }
  };

  const forgotPassword = async (email: string): Promise<string | undefined> => {
    setError(null);
    try {
      const res = await apiRequest<{ devResetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });

      return res.data?.devResetToken;
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'Forgot password request failed.';
      setError(msg);
      throw err;
    }
  };

  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    setError(null);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password, confirmPassword }),
        skipAuth: true,
      });
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'Reset password request failed.';
      setError(msg);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
