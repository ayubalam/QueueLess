import type { ApiResponse } from '../types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/health', '')
  : 'http://localhost:5000';

let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, headers = {}, ...customConfig } = options;

  const config: RequestInit = {
    method: customConfig.method || 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...customConfig,
  };

  if (!skipAuth && inMemoryAccessToken) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    let response = await fetch(url, config);

    if (response.status === 401 && !endpoint.includes('/api/auth/refresh') && !endpoint.includes('/api/auth/login')) {
      const refreshSuccess = await refreshTokenSilent();
      if (refreshSuccess && inMemoryAccessToken) {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${inMemoryAccessToken}`;
        response = await fetch(url, config);
      }
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || 'An unexpected error occurred';
      const errorObj = new Error(errorMessage) as any;
      errorObj.response = data;
      errorObj.status = response.status;
      throw errorObj;
    }

    return data;
  } catch (error: any) {
    if (error.response) {
      throw error;
    }
    throw new Error(error.message || 'Network error occurred');
  }
}

async function refreshTokenSilent(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      inMemoryAccessToken = null;
      return false;
    }

    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      inMemoryAccessToken = data.data.accessToken;
      return true;
    }

    inMemoryAccessToken = null;
    return false;
  } catch {
    inMemoryAccessToken = null;
    return false;
  }
}
