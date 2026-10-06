import { Router } from 'express';
import { getPublicServiceInfo, getPublicQueueStatus } from '../controllers/publicController';

const router = Router();

// Publicly accessible without JWT authentication
router.get('/services/:serviceId', getPublicServiceInfo);
router.get('/queues/:serviceId', getPublicQueueStatus);

export default router;
