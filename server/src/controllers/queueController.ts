import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { QueueToken } from '../models/QueueToken';
import {
  ACTIVE_QUEUE_STATUSES,
  getTodayDateString,
  getNextTokenSequence,
  formatTokenCode,
  calculateQueuePositionAndWait,
} from '../services/queueEngine';
import { joinQueueSchema, queueIdParamSchema } from '../validators/queueValidator';
import { AppError } from '../utils/AppError';
import { broadcastQueueUpdate } from '../socket/socketServer';
import type { QueueUpdatePayload } from '../socket/socketEvents';
import {
  createTokenCancelledNotification,
  checkAndNotifyTurnApproaching,
} from '../services/notificationService';

/**
 * Join an active service queue
 * POST /api/queues/join
 */
export const joinQueue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role !== 'customer') {
      throw new AppError('Access denied. Only customers can join a service queue.', 403);
    }

    const { organizationId, serviceId } = joinQueueSchema.parse(req.body);

    // 1. Verify organization exists and is active
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }
    if (!organization.isActive) {
      throw new AppError('Cannot join queue: Organization is currently inactive', 400);
    }

    // 2. Verify service exists, belongs to the organization, and is active
    const service = await Service.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    if (service.organizationId.toString() !== organizationId) {
      throw new AppError('Selected service does not belong to this organization', 400);
    }
    if (!service.isActive) {
      throw new AppError('Cannot join queue: Service is currently inactive', 400);
    }

    // 3. Verify customer does not already have an active token for this service
    const existingActiveToken = await QueueToken.findOne({
      customerId: req.user._id,
      serviceId,
      status: { $in: ACTIVE_QUEUE_STATUSES },
    });
    if (existingActiveToken) {
      throw new AppError('You already have an active queue token for this service', 400);
    }

    // 4. Concurrency-safe atomic token sequence generation
    const queueDate = getTodayDateString();
    const tokenNumber = await getNextTokenSequence(service._id, queueDate);
    const tokenCode = formatTokenCode(tokenNumber);

    // 5. Calculate initial position and wait time
    const peopleAhead = await QueueToken.countDocuments({
      serviceId: service._id,
      queueDate,
      status: { $in: ACTIVE_QUEUE_STATUSES },
    });
    const position = peopleAhead + 1;
    const estimatedWaitMinutes = Math.max(0, peopleAhead * Math.max(1, service.estimatedServiceTime));

    // 6. Create QueueToken
    const token = await QueueToken.create({
      organizationId: organization._id,
      serviceId: service._id,
      customerId: req.user._id,
      tokenNumber,
      tokenCode,
      queueDate,
      status: 'WAITING',
      joinedAt: new Date(),
      estimatedWaitMinutes,
    });

    // Check if new joiner or next in line qualifies for turn approaching alert (non-blocking)
    checkAndNotifyTurnApproaching(service._id, queueDate).catch((err) =>
      console.error('[queueController] Turn approaching alert error on join:', err)
    );

    res.status(201).json({
      success: true,
      message: 'Successfully joined the queue',
      data: {
        ...token.toObject(),
        position,
        peopleAhead,
        estimatedWaitMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer's current active queue token
 * GET /api/queues/my-active
 */
export const getMyActiveToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = await QueueToken.findOne({
      customerId: req.user!._id,
      status: { $in: ACTIVE_QUEUE_STATUSES },
    })
      .sort({ joinedAt: -1 })
      .populate('organizationId', 'name category address phone')
      .populate('serviceId', 'name estimatedServiceTime description')
      .populate('counterId', 'name location');

    if (!token) {
      res.status(200).json({
        success: true,
        data: null,
      });
      return;
    }

    const estimatedServiceTime = (token.serviceId as any)?.estimatedServiceTime || 15;
    const metrics = await calculateQueuePositionAndWait(token, estimatedServiceTime);

    res.status(200).json({
      success: true,
      data: {
        ...token.toObject(),
        position: metrics.position,
        peopleAhead: metrics.peopleAhead,
        estimatedWaitMinutes: metrics.estimatedWaitMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get queue token details by ID
 * GET /api/queues/:id
 */
export const getQueueTokenById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = queueIdParamSchema.parse(req.params);

    const token = await QueueToken.findById(id)
      .populate('organizationId', 'name category address phone')
      .populate('serviceId', 'name estimatedServiceTime description')
      .populate('counterId', 'name location');

    if (!token) {
      throw new AppError('Queue token not found', 404);
    }

    // Customers can only access their own tokens
    if (token.customerId.toString() !== req.user!._id.toString()) {
      throw new AppError('Access denied. You can only view your own queue token.', 403);
    }

    const estimatedServiceTime = (token.serviceId as any)?.estimatedServiceTime || 15;
    const metrics = await calculateQueuePositionAndWait(token, estimatedServiceTime);

    res.status(200).json({
      success: true,
      data: {
        ...token.toObject(),
        position: metrics.position,
        peopleAhead: metrics.peopleAhead,
        estimatedWaitMinutes: metrics.estimatedWaitMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel / leave queue entry
 * POST /api/queues/:id/cancel
 */
export const cancelQueueToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = queueIdParamSchema.parse(req.params);

    const token = await QueueToken.findById(id);
    if (!token) {
      throw new AppError('Queue token not found', 404);
    }

    // Customers can only cancel their own tokens
    if (token.customerId.toString() !== req.user!._id.toString()) {
      throw new AppError('Access denied. You can only cancel your own queue token.', 403);
    }

    if (token.status === 'COMPLETED') {
      throw new AppError('Cannot cancel a completed queue token.', 400);
    }

    if (token.status === 'CANCELLED') {
      throw new AppError('Token is already cancelled.', 400);
    }

    if (token.status === 'SERVING') {
      throw new AppError('Cannot cancel a token that is currently being served.', 400);
    }

    if (token.status === 'SKIPPED') {
      throw new AppError('Cannot cancel a skipped queue token.', 400);
    }

    token.status = 'CANCELLED';
    token.cancelledAt = new Date();
    await token.save();

    // Broadcast cancellation so other clients in the service room update their positions
    const cancelPayload: QueueUpdatePayload = {
      serviceId: token.serviceId.toString(),
      organizationId: token.organizationId.toString(),
      queueDate: token.queueDate,
      eventType: 'TOKEN_CANCELLED',
      tokenId: token._id.toString(),
      tokenCode: token.tokenCode,
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
    };
    broadcastQueueUpdate(cancelPayload);

    // Notify customer that token was cancelled (non-blocking)
    createTokenCancelledNotification(token).catch((err) =>
      console.error('[queueController] Cancel notification error:', err)
    );
    // Check if remaining waiting customers moved into position <= 2
    checkAndNotifyTurnApproaching(token.serviceId, token.queueDate).catch((err) =>
      console.error('[queueController] Turn approaching alert error:', err)
    );

    res.status(200).json({
      success: true,
      message: 'Queue token cancelled successfully',
      data: token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer's queue history
 * GET /api/queues/my-history
 */
export const getMyQueueHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const history = await QueueToken.find({
      customerId: req.user!._id,
    })
      .sort({ createdAt: -1 })
      .populate('organizationId', 'name category address')
      .populate('serviceId', 'name estimatedServiceTime')
      .populate('counterId', 'name location');

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
