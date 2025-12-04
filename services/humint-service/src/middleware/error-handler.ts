/**
 * Error Handler Middleware
 *
 * Centralized error handling with proper logging and response formatting.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import pino from 'pino';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} with id ${id} not found` : `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export function errorHandler(logger: pino.Logger): ErrorRequestHandler {
  return (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const formattedErrors = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      logger.warn({ errors: formattedErrors, path: req.path }, 'Validation error');

      res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: formattedErrors,
      });
      return;
    }

    // Handle known application errors
    if (err instanceof AppError) {
      if (err.statusCode >= 500) {
        logger.error({ err, path: req.path }, err.message);
      } else {
        logger.warn({ err, path: req.path }, err.message);
      }

      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
      });
      return;
    }

    // Handle unknown errors
    logger.error({ err, path: req.path, stack: err.stack }, 'Unhandled error');

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
    });
  };
}
