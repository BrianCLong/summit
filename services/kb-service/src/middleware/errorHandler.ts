/**
 * Error Handler Middleware
 * Centralized error handling for the KB service
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'kb-service' });

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error({
    err,
    method: req.method,
    url: req.url,
    body: req.body,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Handle known errors
  if (err.statusCode) {
    res.status(err.statusCode).json({
      error: {
        code: err.code || 'ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle specific error messages
  if (err.message.includes('not found')) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.message,
      },
    });
    return;
  }

  if (err.message.includes('Only')) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: err.message,
      },
    });
    return;
  }

  if (err.message.includes('cannot be') || err.message.includes('Invalid')) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: err.message,
      },
    });
    return;
  }

  // Default to 500 Internal Server Error
  const statusCode = 500;
  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

/**
 * Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Create a custom API error
 */
export function createError(
  message: string,
  statusCode: number,
  code?: string
): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
