import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getOverview,
  getDaily,
  getServices,
  getCounters,
  getStaff,
} from '../controllers/analyticsController';

const router = Router();

// Analytics is restricted to authenticated organization administrators
router.use(requireAuth);
router.use(requireRole('organization_admin'));

router.get('/overview', getOverview);
router.get('/daily', getDaily);
router.get('/services', getServices);
router.get('/counters', getCounters);
router.get('/staff', getStaff);

export default router;
