/**
 * Error Handling Middleware
 *
 * Centralized error handling with proper HTTP status codes and logging
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { ZodError } from 'zod';
import pino from 'pino';

const logger = pino({
  name: 'error-handler',
  level: process.env.LOG_LEVEL || 'info',
});

/**
 * Custom application error
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, `${resource}${id ? ` with id ${id}` : ''} not found`, true);
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, true, details);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, true);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, true);
  }
}

/**
 * Validation error
 */
export class ValidationErrorResponse extends AppError {
  constructor(errors: any[]) {
    super(400, 'Validation failed', true, errors);
  }
}

/**
 * Internal server error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: any) {
    super(500, message, false, details);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  details?: any;
  stack?: string;
}

/**
 * Format error response
 */
function formatErrorResponse(
  error: Error,
  statusCode: number,
  includeStack = false
): ErrorResponse {
  const response: ErrorResponse = {
    status: 'error',
    statusCode,
    message: error.message || 'An error occurred',
  };

  // Add details for AppError
  if (error instanceof AppError && error.details) {
    response.details = error.details;
  }

  // Add stack trace in development
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): ErrorResponse {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    status: 'error',
    statusCode: 400,
    message: 'Validation failed',
    details: errors,
  };
}

/**
 * Handle Express validation errors
 */
function handleValidationErrors(errors: ValidationError[]): ErrorResponse {
  const formattedErrors = errors.map((err: any) => ({
    field: err.param || err.path,
    message: err.msg,
    value: err.value,
  }));

  return {
    status: 'error',
    statusCode: 400,
    message: 'Validation failed',
    details: formattedErrors,
  };
}

/**
 * Handle PostgreSQL errors
 */
function handleDatabaseError(error: any): ErrorResponse {
  // PostgreSQL error codes
  const errorCodes: Record<string, { statusCode: number; message: string }> = {
    '23505': { statusCode: 409, message: 'Resource already exists' },
    '23503': { statusCode: 400, message: 'Referenced resource does not exist' },
    '23502': { statusCode: 400, message: 'Required field is missing' },
    '22P02': { statusCode: 400, message: 'Invalid input syntax' },
    '42P01': { statusCode: 500, message: 'Database table does not exist' },
  };

  const errorInfo = errorCodes[error.code];
  if (errorInfo) {
    return {
      status: 'error',
      statusCode: errorInfo.statusCode,
      message: errorInfo.message,
      details: {
        code: error.code,
        detail: error.detail,
      },
    };
  }

  return {
    status: 'error',
    statusCode: 500,
    message: 'Database error occurred',
    details: {
      code: error.code,
    },
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log error
  logger.error(
    {
      err: error,
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body,
      },
    },
    'Request error'
  );

  let response: ErrorResponse;

  // Handle different error types
  if (error instanceof ZodError) {
    response = handleZodError(error);
  } else if (error instanceof AppError) {
    response = formatErrorResponse(error, error.statusCode, isDevelopment);
  } else if ('code' in error && typeof (error as any).code === 'string') {
    // Database error
    response = handleDatabaseError(error);
  } else {
    // Generic error
    response = formatErrorResponse(error, 500, isDevelopment);
  }

  // Send error response
  res.status(response.statusCode).json(response);
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
      'Request completed'
    );
  });

  next();
}
