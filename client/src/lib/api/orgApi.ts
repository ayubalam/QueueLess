import { apiRequest } from '../api';
import type { Organization, Service, Counter, StaffUser } from '../../types/organization';

// Organizations
export const fetchOrganizations = async (): Promise<Organization[]> => {
  const res = await apiRequest<Organization[]>('/api/organizations');
  return res.data!;
};

export const fetchOrganizationById = async (id: string): Promise<Organization> => {
  const res = await apiRequest<Organization>(`/api/organizations/${id}`);
  return res.data!;
};

export const createOrganization = async (data: Partial<Organization>): Promise<Organization> => {
  const res = await apiRequest<Organization>('/api/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const updateOrganization = async (id: string, data: Partial<Organization>): Promise<Organization> => {
  const res = await apiRequest<Organization>(`/api/organizations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const toggleOrganizationStatus = async (id: string): Promise<Organization> => {
  const res = await apiRequest<Organization>(`/api/organizations/${id}/status`, {
    method: 'PATCH',
  });
  return res.data!;
};

export const deleteOrganization = async (id: string): Promise<void> => {
  await apiRequest(`/api/organizations/${id}`, {
    method: 'DELETE',
  });
};

// Services
export const fetchServices = async (organizationId: string): Promise<Service[]> => {
  const res = await apiRequest<Service[]>(`/api/services?organizationId=${organizationId}`);
  return res.data!;
};

export const createService = async (data: {
  organizationId: string;
  name: string;
  description?: string;
  estimatedServiceTime: number;
}): Promise<Service> => {
  const res = await apiRequest<Service>('/api/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const updateService = async (id: string, data: Partial<Service>): Promise<Service> => {
  const res = await apiRequest<Service>(`/api/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const toggleServiceStatus = async (id: string): Promise<Service> => {
  const res = await apiRequest<Service>(`/api/services/${id}/status`, {
    method: 'PATCH',
  });
  return res.data!;
};

export const deleteService = async (id: string): Promise<void> => {
  await apiRequest(`/api/services/${id}`, {
    method: 'DELETE',
  });
};

// Counters
export const fetchCounters = async (organizationId: string, serviceId?: string): Promise<Counter[]> => {
  let url = `/api/counters?organizationId=${organizationId}`;
  if (serviceId) {
    url += `&serviceId=${serviceId}`;
  }
  const res = await apiRequest<Counter[]>(url);
  return res.data!;
};

export const createCounter = async (data: {
  organizationId: string;
  serviceId?: string;
  name: string;
  location?: string;
}): Promise<Counter> => {
  const res = await apiRequest<Counter>('/api/counters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const updateCounter = async (id: string, data: Partial<Counter>): Promise<Counter> => {
  const res = await apiRequest<Counter>(`/api/counters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const toggleCounterStatus = async (id: string): Promise<Counter> => {
  const res = await apiRequest<Counter>(`/api/counters/${id}/status`, {
    method: 'PATCH',
  });
  return res.data!;
};

export const deleteCounter = async (id: string): Promise<void> => {
  await apiRequest(`/api/counters/${id}`, {
    method: 'DELETE',
  });
};

// Staff
export const fetchStaff = async (organizationId: string): Promise<StaffUser[]> => {
  const res = await apiRequest<StaffUser[]>(`/api/staff?organizationId=${organizationId}`);
  return res.data!;
};

export const createStaff = async (data: {
  organizationId: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  counterId?: string;
}): Promise<StaffUser> => {
  const res = await apiRequest<StaffUser>('/api/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data!;
};

export const assignStaffCounter = async (staffId: string, counterId: string | null): Promise<StaffUser> => {
  const res = await apiRequest<StaffUser>(`/api/staff/${staffId}/counter`, {
    method: 'PUT',
    body: JSON.stringify({ counterId }),
  });
  return res.data!;
};

export const toggleStaffStatus = async (staffId: string): Promise<any> => {
  const res = await apiRequest(`/api/staff/${staffId}/status`, {
    method: 'PATCH',
  });
  return res.data!;
};
