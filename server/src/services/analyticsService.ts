import { Types } from 'mongoose';
import { QueueToken } from '../models/QueueToken';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { User } from '../models/User';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface OverviewMetrics {
  organizationId: string;
  dateRange: DateRange;
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  skippedTokens: number;
  waitingTokens: number;
  calledTokens: number;
  servingTokens: number;
  completionRate: number;
  cancellationRate: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface DailyTrendItem {
  date: string;
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  skippedTokens: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface ServicePerformanceItem {
  serviceId: string;
  serviceName: string;
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  skippedTokens: number;
  completionRate: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface CounterPerformanceItem {
  counterId: string;
  counterName: string;
  totalCompleted: number;
  skippedTokens: number;
  completionRate: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface StaffPerformanceItem {
  staffId: string;
  staffName: string;
  counterId?: string | null;
  counterName?: string;
  totalCompleted: number;
  totalSkipped: number;
  averageServiceTime: number;
  averageTokensHandled: number;
  attributionNote: string;
}

/**
 * Expression to calculate wait duration in minutes:
 * (servingStartedAt - joinedAt) / 60000
 * Only when servingStartedAt and joinedAt exist and servingStartedAt >= joinedAt.
 */
const waitDurationExpr = {
  $cond: [
    {
      $and: [
        { $ne: ['$servingStartedAt', null] },
        { $ne: ['$joinedAt', null] },
        { $gte: ['$servingStartedAt', '$joinedAt'] },
      ],
    },
    { $divide: [{ $subtract: ['$servingStartedAt', '$joinedAt'] }, 60000] },
    null,
  ],
};

/**
 * Expression to calculate service duration in minutes:
 * (completedAt - servingStartedAt) / 60000
 * Only when status is COMPLETED and completedAt >= servingStartedAt.
 */
const serviceDurationExpr = {
  $cond: [
    {
      $and: [
        { $eq: ['$status', 'COMPLETED'] },
        { $ne: ['$completedAt', null] },
        { $ne: ['$servingStartedAt', null] },
        { $gte: ['$completedAt', '$servingStartedAt'] },
      ],
    },
    { $divide: [{ $subtract: ['$completedAt', '$servingStartedAt'] }, 60000] },
    null,
  ],
};

const round1 = (val: number | null | undefined): number => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
};

/**
 * 1. Organization Overview Analytics
 */
export const getOrganizationOverview = async (
  organizationId: string | Types.ObjectId,
  dateRange: DateRange
): Promise<OverviewMetrics> => {
  const orgObjId = new Types.ObjectId(organizationId.toString());

  const results = await QueueToken.aggregate([
    {
      $match: {
        organizationId: orgObjId,
        queueDate: { $gte: dateRange.from, $lte: dateRange.to },
      },
    },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: 1 },
        completedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
        cancelledTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
        },
        skippedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'SKIPPED'] }, 1, 0] },
        },
        waitingTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'WAITING'] }, 1, 0] },
        },
        calledTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'CALLED'] }, 1, 0] },
        },
        servingTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'SERVING'] }, 1, 0] },
        },
        avgWaitMinutes: { $avg: waitDurationExpr },
        avgServiceMinutes: { $avg: serviceDurationExpr },
      },
    },
  ]);

  if (!results || results.length === 0) {
    return {
      organizationId: organizationId.toString(),
      dateRange,
      totalTokens: 0,
      completedTokens: 0,
      cancelledTokens: 0,
      skippedTokens: 0,
      waitingTokens: 0,
      calledTokens: 0,
      servingTokens: 0,
      completionRate: 0,
      cancellationRate: 0,
      averageWaitingTime: 0,
      averageServiceTime: 0,
    };
  }

  const r = results[0];
  const total = r.totalTokens || 0;
  const completed = r.completedTokens || 0;
  const cancelled = r.cancelledTokens || 0;

  return {
    organizationId: organizationId.toString(),
    dateRange,
    totalTokens: total,
    completedTokens: completed,
    cancelledTokens: cancelled,
    skippedTokens: r.skippedTokens || 0,
    waitingTokens: r.waitingTokens || 0,
    calledTokens: r.calledTokens || 0,
    servingTokens: r.servingTokens || 0,
    completionRate: total > 0 ? round1((completed / total) * 100) : 0,
    cancellationRate: total > 0 ? round1((cancelled / total) * 100) : 0,
    averageWaitingTime: round1(r.avgWaitMinutes),
    averageServiceTime: round1(r.avgServiceMinutes),
  };
};

/**
 * 2. Daily Trend Analytics
 */
export const getDailyTrend = async (
  organizationId: string | Types.ObjectId,
  dateRange: DateRange
): Promise<DailyTrendItem[]> => {
  const orgObjId = new Types.ObjectId(organizationId.toString());

  const results = await QueueToken.aggregate([
    {
      $match: {
        organizationId: orgObjId,
        queueDate: { $gte: dateRange.from, $lte: dateRange.to },
      },
    },
    {
      $group: {
        _id: '$queueDate',
        totalTokens: { $sum: 1 },
        completedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
        cancelledTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
        },
        skippedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'SKIPPED'] }, 1, 0] },
        },
        avgWaitMinutes: { $avg: waitDurationExpr },
        avgServiceMinutes: { $avg: serviceDurationExpr },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return results.map((r) => ({
    date: r._id,
    totalTokens: r.totalTokens || 0,
    completedTokens: r.completedTokens || 0,
    cancelledTokens: r.cancelledTokens || 0,
    skippedTokens: r.skippedTokens || 0,
    averageWaitingTime: round1(r.avgWaitMinutes),
    averageServiceTime: round1(r.avgServiceMinutes),
  }));
};

/**
 * 3. Service Performance Analytics
 */
export const getServicePerformance = async (
  organizationId: string | Types.ObjectId,
  dateRange: DateRange
): Promise<ServicePerformanceItem[]> => {
  const orgObjId = new Types.ObjectId(organizationId.toString());

  // Fetch all active or existing services for this organization to ensure complete coverage
  const allServices = await Service.find({ organizationId: orgObjId })
    .select('_id name')
    .lean();

  const serviceMap = new Map<string, string>();
  for (const s of allServices) {
    serviceMap.set(s._id.toString(), s.name);
  }

  const results = await QueueToken.aggregate([
    {
      $match: {
        organizationId: orgObjId,
        queueDate: { $gte: dateRange.from, $lte: dateRange.to },
      },
    },
    {
      $group: {
        _id: '$serviceId',
        totalTokens: { $sum: 1 },
        completedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
        cancelledTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
        },
        skippedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'SKIPPED'] }, 1, 0] },
        },
        avgWaitMinutes: { $avg: waitDurationExpr },
        avgServiceMinutes: { $avg: serviceDurationExpr },
      },
    },
    {
      $sort: { totalTokens: -1 },
    },
  ]);

  const itemsMap = new Map<string, ServicePerformanceItem>();

  for (const r of results) {
    const sId = r._id?.toString() || 'unknown';
    const sName = serviceMap.get(sId) || 'Unnamed Service';
    const total = r.totalTokens || 0;
    const completed = r.completedTokens || 0;

    itemsMap.set(sId, {
      serviceId: sId,
      serviceName: sName,
      totalTokens: total,
      completedTokens: completed,
      cancelledTokens: r.cancelledTokens || 0,
      skippedTokens: r.skippedTokens || 0,
      completionRate: total > 0 ? round1((completed / total) * 100) : 0,
      averageWaitingTime: round1(r.avgWaitMinutes),
      averageServiceTime: round1(r.avgServiceMinutes),
    });
  }

  // Include services that had 0 tokens in date range so admin has full visibility
  for (const s of allServices) {
    const sId = s._id.toString();
    if (!itemsMap.has(sId)) {
      itemsMap.set(sId, {
        serviceId: sId,
        serviceName: s.name,
        totalTokens: 0,
        completedTokens: 0,
        cancelledTokens: 0,
        skippedTokens: 0,
        completionRate: 0,
        averageWaitingTime: 0,
        averageServiceTime: 0,
      });
    }
  }

  return Array.from(itemsMap.values()).sort(
    (a, b) => b.totalTokens - a.totalTokens
  );
};

/**
 * 4. Counter Performance Analytics
 */
export const getCounterPerformance = async (
  organizationId: string | Types.ObjectId,
  dateRange: DateRange
): Promise<CounterPerformanceItem[]> => {
  const orgObjId = new Types.ObjectId(organizationId.toString());

  const allCounters = await Counter.find({ organizationId: orgObjId })
    .select('_id name')
    .lean();

  const counterNameMap = new Map<string, string>();
  for (const c of allCounters) {
    counterNameMap.set(c._id.toString(), c.name);
  }

  const results = await QueueToken.aggregate([
    {
      $match: {
        organizationId: orgObjId,
        counterId: { $ne: null },
        queueDate: { $gte: dateRange.from, $lte: dateRange.to },
      },
    },
    {
      $group: {
        _id: '$counterId',
        totalAssigned: { $sum: 1 },
        totalCompleted: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
        skippedTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'SKIPPED'] }, 1, 0] },
        },
        avgWaitMinutes: { $avg: waitDurationExpr },
        avgServiceMinutes: { $avg: serviceDurationExpr },
      },
    },
    {
      $sort: { totalCompleted: -1 },
    },
  ]);

  const itemsMap = new Map<string, CounterPerformanceItem>();

  for (const r of results) {
    const cId = r._id?.toString() || 'unknown';
    const cName = counterNameMap.get(cId) || 'Unnamed Counter';
    const completed = r.totalCompleted || 0;
    const assigned = r.totalAssigned || 0;

    itemsMap.set(cId, {
      counterId: cId,
      counterName: cName,
      totalCompleted: completed,
      skippedTokens: r.skippedTokens || 0,
      completionRate: assigned > 0 ? round1((completed / assigned) * 100) : 0,
      averageWaitingTime: round1(r.avgWaitMinutes),
      averageServiceTime: round1(r.avgServiceMinutes),
    });
  }

  // Include all counters in org even if 0 completed in date range
  for (const c of allCounters) {
    const cId = c._id.toString();
    if (!itemsMap.has(cId)) {
      itemsMap.set(cId, {
        counterId: cId,
        counterName: c.name,
        totalCompleted: 0,
        skippedTokens: 0,
        completionRate: 0,
        averageWaitingTime: 0,
        averageServiceTime: 0,
      });
    }
  }

  return Array.from(itemsMap.values()).sort(
    (a, b) => b.totalCompleted - a.totalCompleted
  );
};

/**
 * 5. Staff Performance Analytics
 * Note: Staff attribution is derived from assigned counterId, as QueueTokens
 * record counterId rather than individual staffId.
 */
export const getStaffPerformance = async (
  organizationId: string | Types.ObjectId,
  dateRange: DateRange
): Promise<StaffPerformanceItem[]> => {
  const orgObjId = new Types.ObjectId(organizationId.toString());

  // Retrieve all staff belonging to this organization
  const staffMembers = await User.find({
    organizationId: orgObjId,
    role: 'staff',
  })
    .select('_id fullName counterId')
    .lean();

  if (staffMembers.length === 0) {
    return [];
  }

  // Fetch counter metrics for the organization in this date range
  const counterMetrics = await getCounterPerformance(orgObjId, dateRange);
  const counterMap = new Map<string, CounterPerformanceItem>();
  for (const cm of counterMetrics) {
    counterMap.set(cm.counterId, cm);
  }

  return staffMembers.map((staff) => {
    const cId = staff.counterId ? staff.counterId.toString() : null;
    const counterMetric = cId ? counterMap.get(cId) : null;

    const completed = counterMetric?.totalCompleted || 0;
    const skipped = counterMetric?.skippedTokens || 0;
    const totalHandled = completed + skipped;

    return {
      staffId: staff._id.toString(),
      staffName: staff.fullName,
      counterId: cId,
      counterName: counterMetric?.counterName || (cId ? 'Assigned Counter' : 'Unassigned'),
      totalCompleted: completed,
      totalSkipped: skipped,
      averageServiceTime: counterMetric?.averageServiceTime || 0,
      averageTokensHandled: totalHandled,
      attributionNote: 'Attributed via assigned service counter.',
    };
  });
};
