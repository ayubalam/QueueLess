export interface Organization {
  _id: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  category: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  estimatedServiceTime: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Counter {
  _id: string;
  organizationId: string;
  serviceId?: {
    _id: string;
    name: string;
  } | string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'staff';
  organizationId?: string;
  counterId?: {
    _id: string;
    name: string;
    location?: string;
  } | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
