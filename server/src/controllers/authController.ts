import { Response, NextFunction } from 'express';
import { AuthService, sanitizeUser } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidator';

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const user = await AuthService.register(validatedInput);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.login(validatedInput);

      res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const { accessToken, refreshToken: newRefreshToken, user } = await AuthService.refresh(rawRefreshToken);

      res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully.',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.logout(rawRefreshToken);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        path: '/api/auth',
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful.',
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          errors: ['No authenticated user found in session'],
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Current user profile retrieved.',
        data: { user: sanitizeUser(req.user) },
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validatedInput);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.devResetToken ? { devResetToken: result.devResetToken } : {},
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validatedInput);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }
}
