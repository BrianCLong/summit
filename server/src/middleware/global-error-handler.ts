import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { cfg } from '../config.js';

const logger = pino();

/**
 * Global Error Handler
 *
 * Ensures consistent error responses and prevents leakage of sensitive information (stack traces, internal paths)
 * to the client.
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const isProduction = cfg.NODE_ENV === 'production';

  // Log the full error internally
  logger.error({
    msg: 'Unhandled exception',
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.id
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Build response
  const response: any = {
    error: isProduction && statusCode === 500 ? 'Internal server error' : (err.message || 'Unknown error'),
    code: err.code || 'INTERNAL_ERROR',
  };

  // In development, include stack trace
  if (!isProduction) {
    response.stack = err.stack;
    response.details = err.details || err.errors; // Zod errors often come in .errors
  } else {
      // In production, include validation details if it's a 400 error
      if (statusCode === 400 && err.errors) {
          response.details = err.errors;
      }
  }

  // Ensure we haven't already sent a response
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json(response);
}
