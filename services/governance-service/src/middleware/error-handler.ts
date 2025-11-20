/**
 * Error Handler Middleware
 * Centralized error handling for the governance service
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { ValidationError } from 'express-validator';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Validation Error
 */
export class RequestValidationError extends AppError {
  constructor(errors: any[]) {
    super('Validation failed', 400, 'VALIDATION_ERROR', errors);
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Format error response
 */
function formatErrorResponse(
  err: Error | AppError,
  req: Request,
  includeStack: boolean = false
): ErrorResponse {
  const isAppError = err instanceof AppError;

  return {
    error: {
      message: err.message || 'An unexpected error occurred',
      code: isAppError ? err.code : 'INTERNAL_SERVER_ERROR',
      statusCode: isAppError ? err.statusCode : 500,
      details: isAppError ? err.details : undefined,
      stack: includeStack ? err.stack : undefined,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  if (statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Don't include stack trace in production
  const includeStack = process.env.NODE_ENV !== 'production';
  const errorResponse = formatErrorResponse(err, req, includeStack);

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError('Route', req.path);
  next(error);
}

/**
 * Validation error handler
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // This will be called by express-validator
  // Implementation will depend on how validation is structured
  next();
}

/**
 * Database error handler
 */
export function handleDatabaseError(err: any): AppError {
  // PostgreSQL error codes
  switch (err.code) {
    case '23505': // unique_violation
      return new ConflictError('Resource already exists', { constraint: err.constraint });
    case '23503': // foreign_key_violation
      return new AppError('Referenced resource does not exist', 400, 'FOREIGN_KEY_VIOLATION');
    case '23502': // not_null_violation
      return new AppError('Required field is missing', 400, 'NOT_NULL_VIOLATION');
    case '42P01': // undefined_table
      return new InternalServerError('Database table does not exist');
    default:
      return new InternalServerError('Database operation failed', {
        code: err.code,
        detail: err.detail,
      });
  }
}

/**
 * Graceful error logger for unhandled rejections
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });
    // Don't exit process in production - let service manager handle restarts
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    // Exit process - service manager should restart
    process.exit(1);
  });
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  NotFoundError,
  RequestValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  handleDatabaseError,
  setupGlobalErrorHandlers,
};
