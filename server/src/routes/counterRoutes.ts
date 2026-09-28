import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  createCounter,
  getCounters,
  getCounterById,
  updateCounter,
  toggleCounterStatus,
  deleteCounter,
} from '../controllers/counterController';

const router = Router();

router.use(requireAuth);

router.get('/', getCounters);
router.get('/:id', getCounterById);

router.post('/', requireRole('organization_admin', 'super_admin'), createCounter);
router.put('/:id', requireRole('organization_admin', 'super_admin'), updateCounter);
router.patch('/:id/status', requireRole('organization_admin', 'super_admin'), toggleCounterStatus);
router.delete('/:id', requireRole('organization_admin', 'super_admin'), deleteCounter);

export default router;
