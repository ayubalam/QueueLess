import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  toggleOrganizationStatus,
  deleteOrganization,
} from '../controllers/organizationController';

const router = Router();

router.use(requireAuth);

router.get('/', getOrganizations);
router.get('/:id', getOrganizationById);

router.post('/', requireRole('organization_admin', 'super_admin'), createOrganization);
router.put('/:id', requireRole('organization_admin', 'super_admin'), updateOrganization);
router.patch('/:id/status', requireRole('organization_admin', 'super_admin'), toggleOrganizationStatus);
router.delete('/:id', requireRole('organization_admin', 'super_admin'), deleteOrganization);

export default router;
