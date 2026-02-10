/**
 * Error Handler Middleware
 *
 * Normalizes errors into the platform-wide envelope
 */

import { errorFactory, isSummitError, SummitError } from '@intelgraph/errors';

import type { Request, Response, NextFunction } from '../types';

function toSummitError(err: Error, req: Request): SummitError {
  if (isSummitError(err)) {
    return err;
  }

  return errorFactory.internal({
    errorCode: 'INTERNAL_UNHANDLED',
    humanMessage: 'An unexpected error occurred.',
    developerMessage: err.message,
    traceId: req.context?.traceId,
    context: {
      path: req.path,
      method: req.method,
    },
    cause: err,
  });
}

function buildMetadata(req: Request) {
  return {
    timestamp: new Date().toISOString(),
    version: req.context?.apiVersion || '1.0',
    requestId: req.context?.requestId || 'unknown',
    traceId: req.context?.traceId,
  };
}

export function errorHandler(options?: {
  includeStack?: boolean;
  logger?: (error: Error, req: Request) => void;
}) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const summitError = toSummitError(err, req);

    if (options?.logger) {
      options.logger(err, req);
    }

    const payload = {
      success: false as const,
      error: summitError.envelope,
      metadata: {
        ...buildMetadata(req),
        duration: req.context ? Date.now() - req.context.startTime : undefined,
      },
    };

    if (options?.includeStack && process.env.NODE_ENV !== 'production') {
      payload.error = {
        ...payload.error,
        context: {
          ...payload.error.context,
          stack: err.stack,
        },
      };
    }

    res.status(summitError.statusCode).json(payload);
  };
}

export function notFoundHandler(req: Request, res: Response) {
  const summitError = errorFactory.validation({
    errorCode: 'ROUTE_NOT_FOUND',
    humanMessage: `Route ${req.method} ${req.path} not found`,
    developerMessage: 'Requested route is not registered in the router',
    traceId: req.context?.traceId,
    context: { path: req.path, method: req.method },
    statusCode: 404,
  });

  res.status(404).json({
    success: false,
    error: summitError.envelope,
    metadata: buildMetadata(req),
  });
}

/**
 * Validation error specifically for REST API
 */
export class ValidationException extends SummitError {
  constructor(message: string, context?: Record<string, any>) {
    const error = errorFactory.validation({
      errorCode: 'VALIDATION_ERROR',
      humanMessage: message,
      developerMessage: message,
      context,
    });
    super(error.envelope, error.statusCode, null);
    this.name = 'ValidationException';
  }
}
