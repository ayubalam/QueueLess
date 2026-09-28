import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  joinQueue,
  getMyActiveToken,
  getQueueTokenById,
  cancelQueueToken,
  getMyQueueHistory,
} from '../controllers/queueController';

const router = Router();

// All customer queue endpoints require authentication and customer role
router.use(requireAuth, requireRole('customer'));

router.post('/join', joinQueue);
router.get('/my-active', getMyActiveToken);
router.get('/my-history', getMyQueueHistory);
router.get('/:id', getQueueTokenById);
router.post('/:id/cancel', cancelQueueToken);

export default router;
