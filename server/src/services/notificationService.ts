import { Types } from 'mongoose';
import { Notification, NotificationType, INotification } from '../models/Notification';
import { QueueToken, IQueueToken } from '../models/QueueToken';
import { emitToUser } from '../socket/socketServer';
import { SOCKET_EVENTS } from '../socket/socketEvents';

export interface CreateNotificationParams {
  userId: string | Types.ObjectId;
  organizationId: string | Types.ObjectId;
  serviceId: string | Types.ObjectId;
  tokenId?: string | Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
}

export interface SafeNotificationPayload {
  _id: string;
  userId: string;
  organizationId: string;
  serviceId: string;
  tokenId?: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Creates a notification record in MongoDB and safely emits a private socket event
 * to user:<userId>. Never throws to prevent disrupting queue operations.
 */
export const createNotification = async (
  params: CreateNotificationParams
): Promise<INotification | null> => {
  try {
    const notification = await Notification.create({
      userId: new Types.ObjectId(params.userId.toString()),
      organizationId: new Types.ObjectId(params.organizationId.toString()),
      serviceId: new Types.ObjectId(params.serviceId.toString()),
      tokenId: params.tokenId ? new Types.ObjectId(params.tokenId.toString()) : undefined,
      type: params.type,
      title: params.title,
      message: params.message,
      isRead: false,
    });

    const payload: SafeNotificationPayload = {
      _id: notification._id.toString(),
      userId: notification.userId.toString(),
      organizationId: notification.organizationId.toString(),
      serviceId: notification.serviceId.toString(),
      tokenId: notification.tokenId?.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };

    // Emit exclusively to private user room
    emitToUser(params.userId.toString(), SOCKET_EVENTS.NOTIFICATION_NEW, payload);

    return notification;
  } catch (error) {
    // Log safely without exposing private data
    console.error('[NotificationService] createNotification error:', (error as any)?.message || error);
    return null;
  }
};

/**
 * Notify customer when their token is CALLED by staff.
 */
export const createTokenCalledNotification = async (token: IQueueToken): Promise<void> => {
  try {
    await createNotification({
      userId: token.customerId,
      organizationId: token.organizationId,
      serviceId: token.serviceId,
      tokenId: token._id,
      type: 'TOKEN_CALLED',
      title: `Token Called: ${token.tokenCode}`,
      message: `Your token ${token.tokenCode} has been called! Please proceed to the service counter.`,
    });
  } catch (err) {
    console.error('[NotificationService] createTokenCalledNotification error:', err);
  }
};

/**
 * Notify customer when staff STARTS SERVING their token.
 */
export const createTokenServingNotification = async (token: IQueueToken): Promise<void> => {
  try {
    await createNotification({
      userId: token.customerId,
      organizationId: token.organizationId,
      serviceId: token.serviceId,
      tokenId: token._id,
      type: 'TOKEN_SERVING',
      title: `Now Serving: ${token.tokenCode}`,
      message: `Your consultation for token ${token.tokenCode} has started.`,
    });
  } catch (err) {
    console.error('[NotificationService] createTokenServingNotification error:', err);
  }
};

/**
 * Notify customer when their token is COMPLETED.
 */
export const createTokenCompletedNotification = async (token: IQueueToken): Promise<void> => {
  try {
    await createNotification({
      userId: token.customerId,
      organizationId: token.organizationId,
      serviceId: token.serviceId,
      tokenId: token._id,
      type: 'TOKEN_COMPLETED',
      title: `Service Completed: ${token.tokenCode}`,
      message: `Your service for token ${token.tokenCode} has been marked completed. Thank you!`,
    });
  } catch (err) {
    console.error('[NotificationService] createTokenCompletedNotification error:', err);
  }
};

/**
 * Notify customer when their token is SKIPPED.
 */
export const createTokenSkippedNotification = async (token: IQueueToken): Promise<void> => {
  try {
    await createNotification({
      userId: token.customerId,
      organizationId: token.organizationId,
      serviceId: token.serviceId,
      tokenId: token._id,
      type: 'TOKEN_SKIPPED',
      title: `Token Skipped: ${token.tokenCode}`,
      message: `Your token ${token.tokenCode} was skipped. Please speak with the service counter staff.`,
    });
  } catch (err) {
    console.error('[NotificationService] createTokenSkippedNotification error:', err);
  }
};

/**
 * Notify customer when their token is CANCELLED.
 */
export const createTokenCancelledNotification = async (token: IQueueToken): Promise<void> => {
  try {
    await createNotification({
      userId: token.customerId,
      organizationId: token.organizationId,
      serviceId: token.serviceId,
      tokenId: token._id,
      type: 'TOKEN_CANCELLED',
      title: `Queue Left: ${token.tokenCode}`,
      message: `Your token ${token.tokenCode} has been cancelled.`,
    });
  } catch (err) {
    console.error('[NotificationService] createTokenCancelledNotification error:', err);
  }
};

/**
 * Checks the top 2 waiting customers for a service and alerts them that their turn
 * is approaching (position <= 2). Idempotent: each token receives TURN_APPROACHING at most once.
 */
export const checkAndNotifyTurnApproaching = async (
  serviceId: string | Types.ObjectId,
  queueDate: string
): Promise<void> => {
  try {
    // Find earliest 2 WAITING tokens
    const topWaitingTokens = await QueueToken.find({
      serviceId,
      queueDate,
      status: 'WAITING',
    })
      .sort({ tokenNumber: 1 })
      .limit(2);

    for (let index = 0; index < topWaitingTokens.length; index++) {
      const token = topWaitingTokens[index];
      const positionInWaiting = index + 1;

      // Check if already notified for this token
      const existingAlert = await Notification.findOne({
        tokenId: token._id,
        type: 'TURN_APPROACHING',
      });

      if (!existingAlert) {
        await createNotification({
          userId: token.customerId,
          organizationId: token.organizationId,
          serviceId: token.serviceId,
          tokenId: token._id,
          type: 'TURN_APPROACHING',
          title: `Your Turn Is Near (#${positionInWaiting})`,
          message: `You are now #${positionInWaiting} in line for token ${token.tokenCode}. Please prepare to proceed to the service counter.`,
        });
      }
    }
  } catch (err) {
    console.error('[NotificationService] checkAndNotifyTurnApproaching error:', err);
  }
};
