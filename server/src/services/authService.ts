import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AppError } from '../utils/AppError';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../validators/authValidator';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/token';

export const sanitizeUser = (user: IUser) => {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 400, [
        'Email is already registered',
      ]);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await User.create({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: 'customer', // Public registration is strictly restricted to customer role
      isEmailVerified: false,
      isActive: true,
    });

    return sanitizeUser(user);
  }

  static async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 403);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    const rawRefreshToken = generateRefreshToken({ userId: user._id.toString(), role: user.role });

    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  static async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new AppError('Refresh token missing.', 401);
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash, isRevoked: false });
    if (!storedToken) {
      throw new AppError('Refresh token revoked or invalid.', 401);
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AppError('User account not found or inactive.', 401);
    }

    // Refresh Token Rotation
    storedToken.isRevoked = true;
    await storedToken.save();

    const newAccessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    const newRawRefreshToken = generateRefreshToken({ userId: user._id.toString(), role: user.role });

    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      user: user._id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
      isRevoked: false,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: sanitizeUser(user),
    };
  }

  static async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
    }
  }

  static async forgotPassword(input: ForgotPasswordInput) {
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      return { message: 'If an account exists with this email, a reset token has been generated.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashToken(resetToken);

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    await user.save();

    // Dev logging approach for password reset token
    console.log('\n========================================');
    console.log(`[DEV ONLY] Password Reset Requested for ${user.email}`);
    console.log(`[DEV ONLY] Reset Token: ${resetToken}`);
    console.log(`[DEV ONLY] Reset Link: http://localhost:5173/reset-password?token=${resetToken}`);
    console.log('========================================\n');

    return {
      message: 'If an account exists with this email, a reset token has been generated.',
      devResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    };
  }

  static async resetPassword(input: ResetPasswordInput) {
    const hashedResetToken = hashToken(input.token);

    const user = await User.findOne({
      resetPasswordToken: hashedResetToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired.', 400);
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(input.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Revoke all existing sessions/refresh tokens for security
    await RefreshToken.updateMany({ user: user._id }, { isRevoked: true });

    return { message: 'Password has been successfully reset. Please log in with your new password.' };
  }
}
