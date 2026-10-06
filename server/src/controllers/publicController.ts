import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Service } from '../models/Service';
import { Organization } from '../models/Organization';
import { QueueToken } from '../models/QueueToken';
import { getTodayDateString } from '../services/queueEngine';

/**
 * GET /api/public/services/:serviceId
 * Returns safe public details of an active service and its organization.
 * Does not expose customer, staff, or authentication data.
 */
export const getPublicServiceInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;

    if (!Types.ObjectId.isValid(serviceId)) {
      res.status(404).json({
        success: false,
        message: 'Service not found or is currently inactive',
      });
      return;
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      res.status(404).json({
        success: false,
        message: 'Service not found or is currently inactive',
      });
      return;
    }

    const organization = await Organization.findById(service.organizationId);
    if (!organization || !organization.isActive) {
      res.status(404).json({
        success: false,
        message: 'Organization not found or is currently inactive',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        serviceId: service._id.toString(),
        name: service.name,
        description: service.description || '',
        estimatedServiceTime: service.estimatedServiceTime,
        organizationId: organization._id.toString(),
        organizationName: organization.name,
        organizationAddress: organization.address,
        organizationPhone: organization.phone,
        organizationEmail: organization.email,
        isActive: service.isActive,
      },
    });
  } catch (error) {
    console.error('getPublicServiceInfo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching service information',
    });
  }
};

/**
 * GET /api/public/queues/:serviceId
 * Returns public queue status for today (Now Serving, Waiting count, Next 5 tokens).
 * No customer IDs or private customer information are exposed.
 */
export const getPublicQueueStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;

    if (!Types.ObjectId.isValid(serviceId)) {
      res.status(404).json({
        success: false,
        message: 'Service not found or is currently inactive',
      });
      return;
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      res.status(404).json({
        success: false,
        message: 'Service not found or is currently inactive',
      });
      return;
    }

    const organization = await Organization.findById(service.organizationId);
    if (!organization || !organization.isActive) {
      res.status(404).json({
        success: false,
        message: 'Organization not found or is currently inactive',
      });
      return;
    }

    const queueDate = getTodayDateString();

    // 1. Current active token (CALLED or SERVING)
    const currentActiveToken = await QueueToken.findOne({
      serviceId: service._id,
      queueDate,
      status: { $in: ['CALLED', 'SERVING'] },
    })
      .sort({ updatedAt: -1 })
      .populate('counterId', 'name location');

    // 2. Waiting count for today
    const waitingCount = await QueueToken.countDocuments({
      serviceId: service._id,
      queueDate,
      status: 'WAITING',
    });

    // 3. Next up to 5 tokens in waiting line
    const nextWaitingTokens = await QueueToken.find({
      serviceId: service._id,
      queueDate,
      status: 'WAITING',
    })
      .sort({ tokenNumber: 1 })
      .limit(5)
      .select('tokenCode tokenNumber status -_id')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        serviceId: service._id.toString(),
        organizationId: organization._id.toString(),
        serviceName: service.name,
        organizationName: organization.name,
        currentServingToken: currentActiveToken
          ? {
              tokenCode: currentActiveToken.tokenCode,
              tokenNumber: currentActiveToken.tokenNumber,
              status: currentActiveToken.status,
              counterName: (currentActiveToken.counterId as any)?.name || null,
            }
          : null,
        currentServingStatus: currentActiveToken ? currentActiveToken.status : null,
        waitingCount,
        nextTokens: nextWaitingTokens.map((t) => ({
          tokenCode: t.tokenCode,
          tokenNumber: t.tokenNumber,
          status: t.status,
        })),
        lastUpdated: new Date().toISOString(),
        queueDate,
      },
    });
  } catch (error) {
    console.error('getPublicQueueStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching queue status',
    });
  }
};
