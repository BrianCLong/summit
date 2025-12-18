/**
 * Error Handling Middleware for Express and GraphQL
 */

import { Request, Response, NextFunction } from 'express';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import pino from 'pino';
import { AppError, toAppError, sanitizeError } from './errors.js';

const logger = pino({ name: 'ErrorMiddleware' });

/**
 * Express error handling middleware
 * Should be added as the last middleware in the chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const appError = toAppError(err);
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error with context
  const logContext = {
    error: appError.toJSON(),
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      ip: req.ip,
      correlationId: req.headers['x-correlation-id'] || req.headers['x-request-id'],
    },
  };

  if (appError.httpStatus >= 500) {
    logger.error(logContext, 'Server error occurred');
  } else {
    logger.warn(logContext, 'Client error occurred');
  }

  // Send error response
  const errorResponse = sanitizeError(appError, isProduction);
  res.status(appError.httpStatus).json({
    ...errorResponse.error,
    requestId: req.headers['x-request-id'] as string,
    path: req.path,
  });
}

/**
 * Async error wrapper for Express route handlers
 * Automatically catches async errors and passes to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GraphQL error formatter
 * Converts errors to standardized format
 */
export function formatGraphQLError(
  error: GraphQLError,
  isProduction: boolean = process.env.NODE_ENV === 'production',
): GraphQLFormattedError {
  // Extract original error
  const originalError = error.originalError;

  // Convert to AppError if not already
  const appError = originalError instanceof AppError
    ? originalError
    : toAppError(originalError || error);

  // Log error
  const logContext = {
    error: appError.toJSON(),
    graphql: {
      path: error.path,
      locations: error.locations,
      extensions: error.extensions,
    },
  };

  if (appError.httpStatus >= 500) {
    logger.error(logContext, 'GraphQL error occurred');
  } else {
    logger.warn(logContext, 'GraphQL validation error');
  }

  // Format error response
  const errorResponse = sanitizeError(appError, isProduction);

  return {
    message: errorResponse.error.message,
    locations: error.locations,
    path: error.path,
    extensions: {
      code: appError.code,
      traceId: appError.traceId,
      timestamp: appError.timestamp.toISOString(),
      httpStatus: appError.httpStatus,
      ...(appError.details && !isProduction && { details: appError.details }),
    },
  };
}

/**
 * Create GraphQL error formatter function
 */
export function createGraphQLErrorFormatter(isProduction?: boolean) {
  const isProd = isProduction ?? process.env.NODE_ENV === 'production';
  return (error: GraphQLError) => formatGraphQLError(error, isProd);
}

/**
 * Not found middleware for Express
 * Should be added before error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const appError = toAppError(new Error(`Route ${req.method} ${req.path} not found`));
  res.status(404).json({
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
      traceId: appError.traceId,
      timestamp: appError.timestamp.toISOString(),
      path: req.path,
    },
  });
}

/**
 * Request correlation ID middleware
 * Adds correlation ID to requests for tracing
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    randomUUID();

  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
}

function randomUUID(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/**
 * Error recovery middleware
 * Attempts to recover from certain error types
 */
export function errorRecoveryMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const appError = toAppError(err);

  // For retryable errors, suggest retry with backoff
  if (appError.retryable) {
    const retryAfter = calculateRetryAfter(appError);
    res.setHeader('Retry-After', retryAfter.toString());
  }

  // Pass to error handler
  next(err);
}

/**
 * Calculate retry-after value based on error type
 */
function calculateRetryAfter(error: AppError): number {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return error.details?.retryAfter || 60;
  }

  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    return error.details?.retryAfter || 30;
  }

  if (error.retryable) {
    return 5;
  }

  return 0;
}
