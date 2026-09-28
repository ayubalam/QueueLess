import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  createStaff,
  getStaffMembers,
  assignStaffCounter,
  toggleStaffStatus,
} from '../controllers/staffController';

const router = Router();

router.use(requireAuth);
router.use(requireRole('organization_admin', 'super_admin'));

router.post('/', createStaff);
router.get('/', getStaffMembers);
router.put('/:id/counter', assignStaffCounter);
router.patch('/:id/status', toggleStaffStatus);

export default router;
