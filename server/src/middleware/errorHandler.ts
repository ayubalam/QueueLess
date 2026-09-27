import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError, ZodIssue } from 'zod';

export const errorHandler = (
  err: Error | AppError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  console.error('[Unhandled Server Error]:', err);

  res.status(500).json({
    success: false,
    message: 'An internal server error occurred',
    errors: process.env.NODE_ENV === 'development' ? [err.message] : [],
  });
};
