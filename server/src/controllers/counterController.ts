import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Counter } from '../models/Counter';
import { Service } from '../models/Service';
import { createCounterSchema, updateCounterSchema } from '../validators/counterValidator';
import { verifyOrganizationOwnership } from '../middleware/orgAuthorization';
import { AppError } from '../utils/AppError';

export const createCounter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createCounterSchema.parse(req.body);

    await verifyOrganizationOwnership(
      validatedData.organizationId,
      req.user!._id,
      req.user!.role
    );

    if (validatedData.serviceId) {
      const service = await Service.findById(validatedData.serviceId);
      if (!service || service.organizationId.toString() !== validatedData.organizationId) {
        throw new AppError('Invalid service for this organization', 400);
      }
    }

    const counter = await Counter.create(validatedData);

    res.status(201).json({
      success: true,
      message: 'Counter created successfully',
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

export const getCounters = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizationId, serviceId } = req.query;
    if (!organizationId) {
      throw new AppError('organizationId query parameter is required', 400);
    }

    const query: any = { organizationId };
    if (serviceId) {
      query.serviceId = serviceId;
    }

    if (req.user?.role === 'customer') {
      query.isActive = true;
    } else if (req.user?.role === 'organization_admin') {
      await verifyOrganizationOwnership(
        organizationId as string,
        req.user._id,
        req.user.role
      );
    }

    const counters = await Counter.find(query).populate('serviceId', 'name').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: counters,
    });
  } catch (error) {
    next(error);
  }
};

export const getCounterById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const counter = await Counter.findById(req.params.id).populate('serviceId', 'name');
    if (!counter) {
      throw new AppError('Counter not found', 404);
    }

    if (req.user?.role === 'organization_admin') {
      await verifyOrganizationOwnership(
        counter.organizationId,
        req.user._id,
        req.user.role
      );
    }

    res.status(200).json({
      success: true,
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCounter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const counter = await Counter.findById(id);
    if (!counter) {
      throw new AppError('Counter not found', 404);
    }

    await verifyOrganizationOwnership(
      counter.organizationId,
      req.user!._id,
      req.user!.role
    );

    const validatedData = updateCounterSchema.parse(req.body);

    if (validatedData.serviceId) {
      const service = await Service.findById(validatedData.serviceId);
      if (!service || service.organizationId.toString() !== counter.organizationId.toString()) {
        throw new AppError('Invalid service for this organization', 400);
      }
    }

    const updatedCounter = await Counter.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    }).populate('serviceId', 'name');

    res.status(200).json({
      success: true,
      message: 'Counter updated successfully',
      data: updatedCounter,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCounterStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const counter = await Counter.findById(id);
    if (!counter) {
      throw new AppError('Counter not found', 404);
    }

    await verifyOrganizationOwnership(
      counter.organizationId,
      req.user!._id,
      req.user!.role
    );

    counter.isActive = !counter.isActive;
    await counter.save();

    res.status(200).json({
      success: true,
      message: `Counter ${counter.isActive ? 'activated' : 'deactivated'} successfully`,
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCounter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const counter = await Counter.findById(id);
    if (!counter) {
      throw new AppError('Counter not found', 404);
    }

    await verifyOrganizationOwnership(
      counter.organizationId,
      req.user!._id,
      req.user!.role
    );

    await Counter.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Counter deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
