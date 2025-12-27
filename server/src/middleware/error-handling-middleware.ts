// centralized-error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { recordEndpointResult } from '../observability/reliability-metrics';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * A centralized error handling middleware.
 *
 * @param err - The error object.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function.
 */
export const centralizedErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If the headers have already been sent, delegate to the default Express error handler.
  if (res.headersSent) {
    return next(err);
  }

  // Determine the status code of the error. Default to 500 for unexpected errors.
  const statusCode = err.statusCode || 500;

  // In a production environment, avoid sending back detailed error messages.
  // We can distinguish between operational errors (expected) and programmer errors (unexpected).
  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    isProduction && !err.isOperational
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  // Log the error for debugging and monitoring purposes.
  logger.error(err.message, {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
  });

  // Restore observability for failed requests.
  recordEndpointResult({
    endpoint: req.path,
    statusCode: statusCode,
    durationSeconds: res.locals.duration || 0,
    tenantId: (req as any).user?.tenantId || 'unknown',
  });

  // Send a standardized error response.
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};
