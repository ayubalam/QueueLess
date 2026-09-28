import { z } from 'zod';

// Strip leading hyphens/whitespace from name fields
const nameField = (min = 2, max = 100) =>
  z
    .string()
    .transform((val) => val.trim().replace(/^[-\s]+/, ''))
    .pipe(z.string().min(min, `Name must be at least ${min} characters`).max(max));

export const createOrganizationSchema = z.object({
  name: nameField(2, 100),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().min(3, 'Address is required'),
  phone: z.string().trim().min(5, 'Valid phone number is required'),
  email: z.string().trim().email('Invalid email address'),
  category: nameField(2, 100),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();
