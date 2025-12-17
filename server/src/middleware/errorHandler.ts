import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { cfg } from '../config.js';
import { UserFacingError, AppError } from '../lib/errors.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use request-scoped logger if available (includes correlationId), otherwise fallback to global logger
  const log = req.log || logger;

  const statusCode = err.statusCode || err.status || 500;
  const correlationId = req.correlationId;
  const traceId = req.traceId;

  // Structured error log
  log.error({
    msg: err.message,
    err, // Serialized error object
    stack: err.stack,
    correlationId,
    traceId,
    path: req.path,
    method: req.method,
    statusCode,
    userId: (req as any).user?.sub || (req as any).user?.id,
    tenantId: (req as any).user?.tenant_id,
  }, `Request failed: ${err.message}`);

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
