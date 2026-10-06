import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Notification } from '../models/Notification';

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 */
export const getMyNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('organizationId', 'name')
        .populate('serviceId', 'name')
        .populate('tokenId', 'tokenCode tokenNumber status')
        .lean(),
      Notification.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns unread notification count for the authenticated user.
 */
export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 * Strict ownership check: only the notification owner can mark it read.
 */
export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
      return;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the authenticated user as read.
 */
export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
