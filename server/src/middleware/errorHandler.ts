import { Request, Response, NextFunction } from 'express';
import { logger, metrics } from '../observability/index.js';
import { cfg } from '../config.js';
import { UserFacingError, AppError } from '../lib/errors.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || err.status || 500;
  const correlationId = req.correlationId;
  const traceId = req.traceId;

  // Emit metric
  metrics.incrementCounter('summit_errors_total', {
    code: statusCode.toString(),
    component: 'http.server',
    tenantId: (req as any).user?.tenant_id || (req as any).tenantId
  });

  // Structured error log using the new Observability Logger which auto-injects context
  // We explicitly pass err object for serialization
  logger.error(err.message, {
    err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
  });

  // Response to client
  const response: any = {
    error: {
      message: 'Internal Server Error',
      correlationId,
      traceId,
    }
  };

  if (err instanceof UserFacingError) {
    response.error.message = err.message;
    // UserFacingError might contain safe-to-expose details
  } else if (err instanceof AppError) {
    // AppError logic if different
    if (statusCode < 500) {
      response.error.message = err.message;
    }
  } else if (cfg.NODE_ENV !== 'production') {
    // In non-production, expose full error details
    response.error.message = err.message;
    response.error.stack = err.stack;
    response.error.code = err.code;
  } else {
    // Production default: hide details for 500s
    if (statusCode < 500) {
      response.error.message = err.message;
    }
  }

  res.status(statusCode).json(response);
};
