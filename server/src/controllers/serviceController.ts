import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { createServiceSchema, updateServiceSchema } from '../validators/serviceValidator';
import { verifyOrganizationOwnership } from '../middleware/orgAuthorization';
import { AppError } from '../utils/AppError';

export const createService = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createServiceSchema.parse(req.body);

    await verifyOrganizationOwnership(
      validatedData.organizationId,
      req.user!._id,
      req.user!.role
    );

    const service = await Service.create(validatedData);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const getServices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      throw new AppError('organizationId query parameter is required', 400);
    }

    const query: any = { organizationId };

    if (req.user?.role === 'customer') {
      query.isActive = true;
    } else if (req.user?.role === 'organization_admin') {
      await verifyOrganizationOwnership(
        organizationId as string,
        req.user._id,
        req.user.role
      );
    }

    const services = await Service.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    if (req.user?.role === 'customer' && !service.isActive) {
      throw new AppError('Service not found', 404);
    }

    if (req.user?.role === 'organization_admin') {
      await verifyOrganizationOwnership(
        service.organizationId,
        req.user._id,
        req.user.role
      );
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    await verifyOrganizationOwnership(
      service.organizationId,
      req.user!._id,
      req.user!.role
    );

    const validatedData = updateServiceSchema.parse(req.body);

    const updatedService = await Service.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleServiceStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    await verifyOrganizationOwnership(
      service.organizationId,
      req.user!._id,
      req.user!.role
    );

    service.isActive = !service.isActive;
    await service.save();

    res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    await verifyOrganizationOwnership(
      service.organizationId,
      req.user!._id,
      req.user!.role
    );

    // Safe delete check: check if counters reference this service
    const activeCounters = await Counter.countDocuments({ serviceId: id, isActive: true });
    if (activeCounters > 0) {
      throw new AppError(
        'Cannot delete service assigned to active counters. Please reassign or deactivate associated counters first.',
        400
      );
    }

    await Service.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
