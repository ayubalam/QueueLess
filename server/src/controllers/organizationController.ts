import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { createOrganizationSchema, updateOrganizationSchema } from '../validators/organizationValidator';
import { verifyOrganizationOwnership } from '../middleware/orgAuthorization';
import { AppError } from '../utils/AppError';

export const createOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createOrganizationSchema.parse(req.body);

    const organization = await Organization.create({
      ...validatedData,
      ownerId: req.user!._id,
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let query: any = {};

    // Role-based visibility rules
    if (req.user?.role === 'customer') {
      query.isActive = true;
    } else if (req.user?.role === 'organization_admin') {
      query.ownerId = req.user._id;
    }
    // super_admin sees all

    const organizations = await Organization.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    if (req.user?.role === 'customer' && !organization.isActive) {
      throw new AppError('Organization not found', 404);
    }

    if (req.user?.role === 'organization_admin') {
      await verifyOrganizationOwnership(organization._id, req.user._id, req.user.role);
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await verifyOrganizationOwnership(id, req.user!._id, req.user!.role);

    const validatedData = updateOrganizationSchema.parse(req.body);

    const updatedOrg = await Organization.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: updatedOrg,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleOrganizationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await verifyOrganizationOwnership(id, req.user!._id, req.user!.role);

    const org = await Organization.findById(id);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    org.isActive = !org.isActive;
    await org.save();

    res.status(200).json({
      success: true,
      message: `Organization ${org.isActive ? 'activated' : 'deactivated'} successfully`,
      data: org,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await verifyOrganizationOwnership(id, req.user!._id, req.user!.role);

    // Safe delete check: check if active services or counters exist
    const activeServices = await Service.countDocuments({ organizationId: id, isActive: true });
    const activeCounters = await Counter.countDocuments({ organizationId: id, isActive: true });

    if (activeServices > 0 || activeCounters > 0) {
      throw new AppError(
        'Cannot delete organization with active services or counters. Please deactivate or delete active services and counters first.',
        400
      );
    }

    await Organization.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
