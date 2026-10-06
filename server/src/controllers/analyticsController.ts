import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Organization } from '../models/Organization';
import { verifyOrganizationOwnership } from '../middleware/orgAuthorization';
import { getTodayDateString } from '../services/queueEngine';
import { AppError } from '../utils/AppError';
import {
  DateRange,
  getOrganizationOverview,
  getDailyTrend,
  getServicePerformance,
  getCounterPerformance,
  getStaffPerformance,
} from '../services/analyticsService';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates and extracts from / to date range query params.
 * Defaults both to today's date if omitted.
 */
export const parseAndValidateDateRange = (
  fromQuery?: unknown,
  toQuery?: unknown
): DateRange => {
  const today = getTodayDateString();
  const from = (fromQuery as string) || today;
  const to = (toQuery as string) || today;

  if (!DATE_REGEX.test(from)) {
    throw new AppError('Invalid "from" date format. Expected YYYY-MM-DD.', 400);
  }
  if (!DATE_REGEX.test(to)) {
    throw new AppError('Invalid "to" date format. Expected YYYY-MM-DD.', 400);
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new AppError('Invalid date values provided.', 400);
  }

  if (from > to) {
    throw new AppError('Invalid date range: "from" date cannot be after "to" date.', 400);
  }

  return { from, to };
};

/**
 * Resolves and verifies the target organization ID for the authenticated user.
 * Ensures strict cross-organization authorization.
 */
const resolveOrganizationId = async (req: AuthenticatedRequest): Promise<string> => {
  const queryOrgId = req.query.organizationId as string | undefined;

  if (queryOrgId) {
    await verifyOrganizationOwnership(queryOrgId, req.user!._id, req.user!.role);
    return queryOrgId;
  }

  if (req.user?.organizationId) {
    return req.user.organizationId.toString();
  }

  // Fallback to organization owned by this admin
  const org = await Organization.findOne({ ownerId: req.user!._id });
  if (!org) {
    throw new AppError('No organization associated with this administrator.', 404);
  }

  return org._id.toString();
};

/**
 * GET /api/analytics/overview
 */
export const getOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = await resolveOrganizationId(req);
    const dateRange = parseAndValidateDateRange(req.query.from, req.query.to);

    const data = await getOrganizationOverview(orgId, dateRange);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/daily
 */
export const getDaily = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = await resolveOrganizationId(req);
    const dateRange = parseAndValidateDateRange(req.query.from, req.query.to);

    const data = await getDailyTrend(orgId, dateRange);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/services
 */
export const getServices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = await resolveOrganizationId(req);
    const dateRange = parseAndValidateDateRange(req.query.from, req.query.to);

    const data = await getServicePerformance(orgId, dateRange);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/counters
 */
export const getCounters = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = await resolveOrganizationId(req);
    const dateRange = parseAndValidateDateRange(req.query.from, req.query.to);

    const data = await getCounterPerformance(orgId, dateRange);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/staff
 */
export const getStaff = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = await resolveOrganizationId(req);
    const dateRange = parseAndValidateDateRange(req.query.from, req.query.to);

    const data = await getStaffPerformance(orgId, dateRange);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
