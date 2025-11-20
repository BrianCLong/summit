/**
 * Standardized Error Classes for Summit Platform
 */

import { randomUUID } from 'node:crypto';
import { ErrorCode, ErrorCodes } from './error-codes.js';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    traceId: string;
    timestamp: string;
    details?: Record<string, any>;
    path?: string;
    requestId?: string;
  };
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly traceId: string;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;
  public readonly retryable: boolean;
  public readonly details?: Record<string, any>;
  public readonly cause?: Error;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, any>,
    cause?: Error,
  ) {
    const errorDef = ErrorCodes[code];
    super(message || errorDef.message);

    this.name = 'AppError';
    this.code = code;
    this.httpStatus = errorDef.httpStatus;
    this.traceId = randomUUID();
    this.timestamp = new Date();
    this.isOperational = true;
    this.retryable = errorDef.retryable;
    this.details = details;
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to standardized error response format
   */
  toResponse(requestId?: string, path?: string): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        traceId: this.traceId,
        timestamp: this.timestamp.toISOString(),
        ...(this.details && { details: this.details }),
        ...(path && { path }),
        ...(requestId && { requestId }),
      },
    };
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      traceId: this.traceId,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      details: this.details,
      stack: this.stack,
      cause: this.cause
        ? {
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }
}

/**
 * Validation error - for input validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message?: string,
    details?: Record<string, any>,
    cause?: Error,
  ) {
    super('VALIDATION_FAILED', message, details, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error - for auth failures
 */
export class AuthenticationError extends AppError {
  constructor(
    code: ErrorCode = 'AUTH_FAILED',
    message?: string,
    details?: Record<string, any>,
  ) {
    super(code, message, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(
    code: ErrorCode = 'FORBIDDEN',
    message?: string,
    details?: Record<string, any>,
  ) {
    super(code, message, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    resource?: string,
    details?: Record<string, any>,
  ) {
    const message = resource
      ? `${resource} not found`
      : ErrorCodes.RESOURCE_NOT_FOUND.message;
    super('RESOURCE_NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error - for duplicate resources, etc.
 */
export class ConflictError extends AppError {
  constructor(
    message?: string,
    details?: Record<string, any>,
  ) {
    super('RESOURCE_CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(
    retryAfter?: number,
    details?: Record<string, any>,
  ) {
    const detailsWithRetry = retryAfter
      ? { ...details, retryAfter }
      : details;
    super('RATE_LIMIT_EXCEEDED', undefined, detailsWithRetry);
    this.name = 'RateLimitError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, any>,
    cause?: Error,
  ) {
    super(code, message, details, cause);
    this.name = 'DatabaseError';
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(
    code: ErrorCode,
    serviceName: string,
    message?: string,
    details?: Record<string, any>,
    cause?: Error,
  ) {
    const detailsWithService = { ...details, service: serviceName };
    super(code, message, detailsWithService, cause);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(
    operation: string,
    timeoutMs: number,
    details?: Record<string, any>,
  ) {
    const detailsWithTimeout = { ...details, operation, timeoutMs };
    super('OPERATION_TIMEOUT', `${operation} timed out after ${timeoutMs}ms`, detailsWithTimeout);
    this.name = 'TimeoutError';
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitBreakerError extends AppError {
  constructor(
    serviceName: string,
    details?: Record<string, any>,
  ) {
    const detailsWithService = { ...details, service: serviceName };
    super('CIRCUIT_BREAKER_OPEN', `Circuit breaker open for ${serviceName}`, detailsWithService);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Internal server error - for unexpected errors
 */
export class InternalError extends AppError {
  constructor(
    message?: string,
    details?: Record<string, any>,
    cause?: Error,
  ) {
    super('INTERNAL_SERVER_ERROR', message, details, cause);
    this.name = 'InternalError';
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message?: string,
    details?: Record<string, any>,
  ) {
    super('SERVICE_UNAVAILABLE', message, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, undefined, error);
  }

  return new InternalError(String(error));
}

/**
 * Sanitize error for production (hide sensitive details)
 */
export function sanitizeError(error: AppError, isProduction: boolean): ErrorResponse {
  if (!isProduction) {
    return error.toResponse();
  }

  // In production, hide internal error details
  if (error.httpStatus >= 500) {
    return {
      error: {
        code: error.code,
        message: 'An internal error occurred',
        traceId: error.traceId,
        timestamp: error.timestamp.toISOString(),
      },
    };
  }

  // For client errors, return full details
  return error.toResponse();
}
