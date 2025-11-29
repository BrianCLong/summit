/**
 * Express error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { ModelHubError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.error({
    message: 'Request error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ModelHubError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        name: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: { issues: err.errors },
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      name: 'InternalError',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message,
    },
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
