import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Counter } from '../models/Counter';
import { createStaffSchema, assignCounterSchema } from '../validators/staffValidator';
import { verifyOrganizationOwnership } from '../middleware/orgAuthorization';
import { AppError } from '../utils/AppError';

export const createStaff = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createStaffSchema.parse(req.body);

    await verifyOrganizationOwnership(
      validatedData.organizationId,
      req.user!._id,
      req.user!.role
    );

    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email address is already registered', 400);
    }

    if (validatedData.counterId) {
      const counter = await Counter.findById(validatedData.counterId);
      if (!counter || counter.organizationId.toString() !== validatedData.organizationId) {
        throw new AppError('Invalid counter for this organization', 400);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const staff = await User.create({
      fullName: validatedData.fullName,
      email: validatedData.email.toLowerCase(),
      phone: validatedData.phone,
      passwordHash,
      role: 'staff',
      organizationId: validatedData.organizationId,
      counterId: validatedData.counterId || undefined,
      isEmailVerified: true,
      isActive: true,
    });

    const responseStaff = staff.toObject();
    delete (responseStaff as any).passwordHash;

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      data: responseStaff,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      throw new AppError('organizationId query parameter is required', 400);
    }

    await verifyOrganizationOwnership(
      organizationId as string,
      req.user!._id,
      req.user!.role
    );

    const staffList = await User.find({
      organizationId,
      role: 'staff',
    })
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
      .populate('counterId', 'name location serviceId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
};

export const assignStaffCounter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const staffUser = await User.findById(id);

    if (!staffUser || staffUser.role !== 'staff') {
      throw new AppError('Staff user not found', 404);
    }

    if (!staffUser.organizationId) {
      throw new AppError('Staff user does not belong to any organization', 400);
    }

    await verifyOrganizationOwnership(
      staffUser.organizationId,
      req.user!._id,
      req.user!.role
    );

    const validatedData = assignCounterSchema.parse(req.body);

    if (validatedData.counterId) {
      const counter = await Counter.findById(validatedData.counterId);
      if (!counter || counter.organizationId.toString() !== staffUser.organizationId.toString()) {
        throw new AppError('Invalid counter for this organization', 400);
      }
      staffUser.counterId = counter._id as any;
    } else {
      staffUser.counterId = undefined;
    }

    await staffUser.save();

    const updatedStaff = await User.findById(id)
      .select('-passwordHash')
      .populate('counterId', 'name location serviceId');

    res.status(200).json({
      success: true,
      message: 'Counter assignment updated successfully',
      data: updatedStaff,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStaffStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const staffUser = await User.findById(id);

    if (!staffUser || staffUser.role !== 'staff') {
      throw new AppError('Staff user not found', 404);
    }

    if (!staffUser.organizationId) {
      throw new AppError('Staff user does not belong to an organization', 400);
    }

    await verifyOrganizationOwnership(
      staffUser.organizationId,
      req.user!._id,
      req.user!.role
    );

    staffUser.isActive = !staffUser.isActive;
    await staffUser.save();

    res.status(200).json({
      success: true,
      message: `Staff user ${staffUser.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: staffUser._id,
        fullName: staffUser.fullName,
        email: staffUser.email,
        isActive: staffUser.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};
