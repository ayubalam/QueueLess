import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getQueueContext,
  callNextToken,
  startServingToken,
  completeToken,
  skipToken,
} from '../controllers/staffQueueController';

const router = Router();

// All staff queue routes require authentication and 'staff' role
router.use(requireAuth);
router.use(requireRole('staff'));

router.get('/', getQueueContext);
router.post('/call-next', callNextToken);
router.post('/:id/start', startServingToken);
router.post('/:id/complete', completeToken);
router.post('/:id/skip', skipToken);

export default router;
