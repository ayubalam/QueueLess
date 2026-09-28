import { z } from 'zod';

export const joinQueueSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
});

export const queueIdParamSchema = z.object({
  id: z.string().min(1, 'Queue Token ID is required'),
});
