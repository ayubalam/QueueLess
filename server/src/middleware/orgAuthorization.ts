import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { Organization } from '../models/Organization';
import { AppError } from '../utils/AppError';
import { Types } from 'mongoose';

/**
 * Ensures that an organization_admin user only interacts with organizations they own,
 * or staff belonging to their organization. Super admins can access any organization.
 */
export const verifyOrganizationOwnership = async (
  organizationId: string | Types.ObjectId,
  userId: Types.ObjectId,
  userRole: string
): Promise<boolean> => {
  if (userRole === 'super_admin') return true;

  const org = await Organization.findById(organizationId);
  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  if (org.ownerId.toString() !== userId.toString()) {
    throw new AppError('Access denied. You do not own or manage this organization.', 403);
  }

  return true;
};
