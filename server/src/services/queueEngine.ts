import { Types } from 'mongoose';
import { QueueSequence } from '../models/QueueSequence';
import { QueueToken, IQueueToken, QueueTokenStatus } from '../models/QueueToken';

export const ACTIVE_QUEUE_STATUSES: QueueTokenStatus[] = ['WAITING', 'CALLED', 'SERVING'];
export const FINISHED_QUEUE_STATUSES: QueueTokenStatus[] = ['COMPLETED', 'SKIPPED', 'CANCELLED'];

/**
 * Returns today's date formatted as YYYY-MM-DD in UTC
 */
export const getTodayDateString = (date: Date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Concurrency-safe atomic token counter.
 * Atomically increments the daily sequence number for the specified service.
 */
export const getNextTokenSequence = async (
  serviceId: Types.ObjectId | string,
  queueDate: string
): Promise<number> => {
  const sequence = await QueueSequence.findOneAndUpdate(
    { serviceId, queueDate },
    { $inc: { currentNumber: 1 } },
    { new: true, upsert: true }
  );

  return sequence.currentNumber;
};

/**
 * Generates a clean, readable token code (e.g., A001, A023, A100).
 * Defaults to 'A' prefix, or letter derived from service name.
 */
export const formatTokenCode = (tokenNumber: number, prefix: string = 'A'): string => {
  const cleanPrefix = (prefix.trim()[0] || 'A').toUpperCase();
  const paddedNumber = String(tokenNumber).padStart(3, '0');
  return `${cleanPrefix}${paddedNumber}`;
};

export interface QueuePositionMetrics {
  position: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
}

/**
 * Calculates current queue position, people ahead, and estimated wait minutes.
 * Only active queue states ('WAITING', 'CALLED', 'SERVING') affect waiting position.
 * Completed, cancelled, and skipped tokens are excluded.
 */
export const calculateQueuePositionAndWait = async (
  token: IQueueToken,
  serviceEstimatedTime: number
): Promise<QueuePositionMetrics> => {
  // If token is already finished
  if (FINISHED_QUEUE_STATUSES.includes(token.status)) {
    return {
      position: 0,
      peopleAhead: 0,
      estimatedWaitMinutes: 0,
    };
  }

  // If token is currently CALLED or SERVING
  if (token.status === 'CALLED' || token.status === 'SERVING') {
    return {
      position: 1,
      peopleAhead: 0,
      estimatedWaitMinutes: 0,
    };
  }

  // If token is WAITING:
  // Count active tokens for the same service and date that are ahead in the queue
  const peopleAhead = await QueueToken.countDocuments({
    serviceId: token.serviceId,
    queueDate: token.queueDate,
    status: { $in: ACTIVE_QUEUE_STATUSES },
    tokenNumber: { $lt: token.tokenNumber },
  });

  const position = peopleAhead + 1;
  const estimatedWaitMinutes = Math.max(0, peopleAhead * Math.max(1, serviceEstimatedTime));

  return {
    position,
    peopleAhead,
    estimatedWaitMinutes,
  };
};
