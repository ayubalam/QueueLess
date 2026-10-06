import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController';

const router = Router();

// All notification endpoints require JWT authentication
router.use(requireAuth);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

export default router;
