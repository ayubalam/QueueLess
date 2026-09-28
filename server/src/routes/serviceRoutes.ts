import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  toggleServiceStatus,
  deleteService,
} from '../controllers/serviceController';

const router = Router();

router.use(requireAuth);

router.get('/', getServices);
router.get('/:id', getServiceById);

router.post('/', requireRole('organization_admin', 'super_admin'), createService);
router.put('/:id', requireRole('organization_admin', 'super_admin'), updateService);
router.patch('/:id/status', requireRole('organization_admin', 'super_admin'), toggleServiceStatus);
router.delete('/:id', requireRole('organization_admin', 'super_admin'), deleteService);

export default router;
