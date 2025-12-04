/**
 * Error Handler Middleware
 *
 * Handles errors and formats error responses
 */

import type { Request, Response, NextFunction, APIError } from '../types';

export class APIException extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'APIException';
    this.statusCode = statusCode;
    this.code = code || `ERROR_${statusCode}`;
    this.details = details;
  }
}

export class BadRequestException extends APIException {
  constructor(message: string, details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedException extends APIException {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenException extends APIException {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundException extends APIException {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

export class ConflictException extends APIException {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationException extends APIException {
  constructor(message: string, details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class TooManyRequestsException extends APIException {
  constructor(message: string = 'Too many requests', details?: any) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

export class InternalServerException extends APIException {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

export function errorHandler(options?: {
  includeStack?: boolean;
  logger?: (error: Error, req: Request) => void;
}) {
  return (err: Error | APIException, req: Request, res: Response, next: NextFunction) => {
    // Log error
    if (options?.logger) {
      options.logger(err, req);
    } else {
      console.error('API Error:', err);
    }

    // Determine status code
    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;

    if (err instanceof APIException) {
      statusCode = err.statusCode;
      code = err.code;
      details = err.details;
    }

    // Create error response
    const apiError: APIError = {
      code,
      message: err.message,
      details,
      timestamp: new Date().toISOString(),
      path: req.path,
      traceId: req.context?.traceId,
    };

    // Include stack trace in development
    if (options?.includeStack && process.env.NODE_ENV !== 'production') {
      (apiError as any).stack = err.stack;
    }

    res.status(statusCode).json({
      success: false,
      error: apiError,
      metadata: {
        timestamp: new Date().toISOString(),
        version: req.context?.apiVersion || '1.0',
        requestId: req.context?.requestId,
      },
    });
  };
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      path: req.path,
      traceId: req.context?.traceId,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: req.context?.apiVersion || '1.0',
      requestId: req.context?.requestId,
    },
  });
}
