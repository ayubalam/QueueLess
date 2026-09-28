import { z } from 'zod';

export const createStaffSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  counterId: z.string().optional(),
});

export const assignCounterSchema = z.object({
  counterId: z.string().nullable(),
});
