import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { QueueToken } from '../models/QueueToken';
import { Counter } from '../models/Counter';
import { Service } from '../models/Service';
import { getTodayDateString } from '../services/queueEngine';

// GET /api/staff/queue
export const getQueueContext = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user.counterId) {
      return res.status(403).json({ success: false, message: 'Staff member is not assigned to a counter' });
    }

    const counter = await Counter.findById(user.counterId).populate('serviceId');
    if (!counter) {
      return res.status(404).json({ success: false, message: 'Assigned counter not found' });
    }
    if (!counter.serviceId) {
      return res.status(400).json({ success: false, message: 'Assigned counter has no service associated' });
    }

    const serviceId = (counter.serviceId as any)._id;
    const today = getTodayDateString();

    const currentActiveToken = await QueueToken.findOne({
      counterId: counter._id,
      queueDate: today,
      status: { $in: ['CALLED', 'SERVING'] },
    });

    const waitingQueue = await QueueToken.find({
      serviceId,
      queueDate: today,
      status: 'WAITING',
    }).sort({ tokenNumber: 1 });

    const allTodayTokens = await QueueToken.find({
      serviceId,
      queueDate: today,
    });

    const stats = {
      waiting: allTodayTokens.filter(t => t.status === 'WAITING').length,
      called: allTodayTokens.filter(t => t.status === 'CALLED').length,
      serving: allTodayTokens.filter(t => t.status === 'SERVING').length,
      completed: allTodayTokens.filter(t => t.status === 'COMPLETED' && t.counterId?.toString() === counter._id.toString()).length,
      skipped: allTodayTokens.filter(t => t.status === 'SKIPPED' && (t.counterId?.toString() === counter._id.toString() || !t.counterId)).length,
    };

    res.json({
      success: true,
      data: {
        organizationId: counter.organizationId,
        counter: counter,
        service: counter.serviceId,
        currentActiveToken,
        waitingQueue,
        stats,
      }
    });
  } catch (error) {
    console.error('getQueueContext error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/staff/queue/call-next
export const callNextToken = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user.counterId) {
      return res.status(403).json({ success: false, message: 'Staff member is not assigned to a counter' });
    }

    const counter = await Counter.findById(user.counterId);
    if (!counter || !counter.serviceId) {
      return res.status(400).json({ success: false, message: 'Counter or service not found' });
    }

    const today = getTodayDateString();

    const existingActive = await QueueToken.findOne({
      counterId: counter._id,
      queueDate: today,
      status: { $in: ['CALLED', 'SERVING'] },
    });

    if (existingActive) {
      return res.status(400).json({ success: false, message: 'Counter already has an active token. Complete or skip it first.' });
    }

    const calledToken = await QueueToken.findOneAndUpdate(
      {
        serviceId: counter.serviceId,
        queueDate: today,
        status: 'WAITING',
      },
      {
        $set: {
          status: 'CALLED',
          calledAt: new Date(),
          counterId: counter._id,
        },
      },
      {
        sort: { tokenNumber: 1 },
        new: true,
      }
    );

    if (!calledToken) {
      return res.status(404).json({ success: false, message: 'No waiting tokens available' });
    }

    res.json({ success: true, data: calledToken });
  } catch (error) {
    console.error('callNextToken error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/staff/queue/:id/start
export const startServingToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid token ID' });

    const user = (req as any).user;
    if (!user.counterId) return res.status(403).json({ success: false, message: 'No counter assigned' });

    const token = await QueueToken.findById(id);
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });

    if (token.status !== 'CALLED') {
      return res.status(400).json({ success: false, message: 'Only CALLED tokens can be started' });
    }

    if (token.counterId?.toString() !== user.counterId.toString()) {
      return res.status(403).json({ success: false, message: 'Token is not assigned to your counter' });
    }

    token.status = 'SERVING';
    token.servingStartedAt = new Date();
    await token.save();

    res.json({ success: true, data: token });
  } catch (error) {
    console.error('startServingToken error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/staff/queue/:id/complete
export const completeToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid token ID' });

    const user = (req as any).user;
    if (!user.counterId) return res.status(403).json({ success: false, message: 'No counter assigned' });

    const token = await QueueToken.findById(id);
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });

    if (token.status !== 'SERVING') {
      return res.status(400).json({ success: false, message: 'Only SERVING tokens can be completed' });
    }

    if (token.counterId?.toString() !== user.counterId.toString()) {
      return res.status(403).json({ success: false, message: 'Token is not assigned to your counter' });
    }

    token.status = 'COMPLETED';
    token.completedAt = new Date();
    await token.save();

    res.json({ success: true, data: token });
  } catch (error) {
    console.error('completeToken error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/staff/queue/:id/skip
export const skipToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid token ID' });

    const user = (req as any).user;
    if (!user.counterId) return res.status(403).json({ success: false, message: 'No counter assigned' });

    const token = await QueueToken.findById(id);
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });

    if (token.status === 'WAITING') {
      const counter = await Counter.findById(user.counterId);
      if (!counter || token.serviceId.toString() !== counter.serviceId?.toString()) {
        return res.status(403).json({ success: false, message: 'Token does not belong to your service' });
      }
    } else if (token.status === 'CALLED') {
      if (token.counterId?.toString() !== user.counterId.toString()) {
        return res.status(403).json({ success: false, message: 'Token is not assigned to your counter' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Only WAITING or CALLED tokens can be skipped' });
    }

    token.status = 'SKIPPED';
    await token.save();

    res.json({ success: true, data: token });
  } catch (error) {
    console.error('skipToken error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
