import { apiRequest } from '../api';
import type {
  AnalyticsOverview,
  DailyAnalyticsItem,
  ServiceAnalyticsItem,
  CounterAnalyticsItem,
  StaffAnalyticsItem,
} from '../../types/analytics';

const buildQueryParams = (from?: string, to?: string, organizationId?: string): string => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (organizationId) params.set('organizationId', organizationId);
  const str = params.toString();
  return str ? `?${str}` : '';
};

export const getAnalyticsOverview = async (
  from?: string,
  to?: string,
  organizationId?: string
): Promise<AnalyticsOverview> => {
  const qs = buildQueryParams(from, to, organizationId);
  const response = await apiRequest<AnalyticsOverview>(`/api/analytics/overview${qs}`);
  return response.data!;
};

export const getDailyAnalytics = async (
  from?: string,
  to?: string,
  organizationId?: string
): Promise<DailyAnalyticsItem[]> => {
  const qs = buildQueryParams(from, to, organizationId);
  const response = await apiRequest<DailyAnalyticsItem[]>(`/api/analytics/daily${qs}`);
  return response.data || [];
};

export const getServiceAnalytics = async (
  from?: string,
  to?: string,
  organizationId?: string
): Promise<ServiceAnalyticsItem[]> => {
  const qs = buildQueryParams(from, to, organizationId);
  const response = await apiRequest<ServiceAnalyticsItem[]>(`/api/analytics/services${qs}`);
  return response.data || [];
};

export const getCounterAnalytics = async (
  from?: string,
  to?: string,
  organizationId?: string
): Promise<CounterAnalyticsItem[]> => {
  const qs = buildQueryParams(from, to, organizationId);
  const response = await apiRequest<CounterAnalyticsItem[]>(`/api/analytics/counters${qs}`);
  return response.data || [];
};

export const getStaffAnalytics = async (
  from?: string,
  to?: string,
  organizationId?: string
): Promise<StaffAnalyticsItem[]> => {
  const qs = buildQueryParams(from, to, organizationId);
  const response = await apiRequest<StaffAnalyticsItem[]>(`/api/analytics/staff${qs}`);
  return response.data || [];
};
