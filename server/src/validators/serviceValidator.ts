import { z } from 'zod';

// Shared name transform: trim whitespace then strip any leading hyphens/dashes
const nameField = (min = 2, max = 100) =>
  z
    .string()
    .transform((val) => val.trim().replace(/^[-\s]+/, ''))
    .pipe(z.string().min(min, `Name must be at least ${min} characters`).max(max));

export const createServiceSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  name: nameField(2, 100),
  description: z.string().trim().max(500).optional(),
  estimatedServiceTime: z.number().int().min(1, 'Estimated time must be at least 1 minute').max(480),
});

export const updateServiceSchema = z.object({
  name: nameField(2, 100).optional(),
  description: z.string().trim().max(500).optional(),
  estimatedServiceTime: z.number().int().min(1).max(480).optional(),
});
