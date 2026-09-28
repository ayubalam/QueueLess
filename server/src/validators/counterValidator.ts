import { z } from 'zod';

// Strip leading hyphens/whitespace from name fields
const nameField = (min = 1, max = 100) =>
  z
    .string()
    .transform((val) => val.trim().replace(/^[-\s]+/, ''))
    .pipe(z.string().min(min, `Name must be at least ${min} characters`).max(max));

export const createCounterSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  serviceId: z.string().optional(),
  name: nameField(1, 100),
  location: z.string().trim().max(200).optional(),
});

export const updateCounterSchema = z.object({
  serviceId: z.string().nullable().optional(),
  name: nameField(1, 100).optional(),
  location: z.string().trim().max(200).optional(),
});
