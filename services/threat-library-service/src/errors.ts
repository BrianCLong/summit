/**
 * Custom Error Classes for Threat Library Service
 */

/**
 * Base error class for threat library service
 */
export class ThreatLibraryError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'ThreatLibraryError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ThreatLibraryError {
  constructor(resourceType: string, id: string, details?: unknown) {
    super(
      `${resourceType} with id '${id}' not found`,
      'RESOURCE_NOT_FOUND',
      404,
      details
    );
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends ThreatLibraryError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Conflict error for duplicate resources or version conflicts
 */
export class ConflictError extends ThreatLibraryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Pattern evaluation error
 */
export class PatternEvaluationError extends ThreatLibraryError {
  constructor(message: string, patternId: string, details?: unknown) {
    super(message, 'PATTERN_EVALUATION_ERROR', 500, { patternId, ...details as object });
    this.name = 'PatternEvaluationError';
  }
}

/**
 * Invalid pattern definition error
 */
export class InvalidPatternError extends ThreatLibraryError {
  constructor(message: string, patternId?: string, details?: unknown) {
    super(message, 'INVALID_PATTERN', 400, { patternId, ...details as object });
    this.name = 'InvalidPatternError';
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends ThreatLibraryError {
  constructor(serviceName: string, details?: unknown) {
    super(
      `Service '${serviceName}' is currently unavailable`,
      'SERVICE_UNAVAILABLE',
      503,
      details
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Timeout error for long-running operations
 */
export class TimeoutError extends ThreatLibraryError {
  constructor(operation: string, timeoutMs: number, details?: unknown) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      408,
      details
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Authorization error
 */
export class UnauthorizedError extends ThreatLibraryError {
  constructor(message: string = 'Unauthorized access', details?: unknown) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error for permission issues
 */
export class ForbiddenError extends ThreatLibraryError {
  constructor(
    message: string = 'Access forbidden',
    resource?: string,
    details?: unknown
  ) {
    super(message, 'FORBIDDEN', 403, { resource, ...details as object });
    this.name = 'ForbiddenError';
  }
}

/**
 * Error handler utility for Express middleware
 */
export function isKnownError(error: unknown): error is ThreatLibraryError {
  return error instanceof ThreatLibraryError;
}

/**
 * Convert unknown error to ThreatLibraryError
 */
export function toThreatLibraryError(error: unknown): ThreatLibraryError {
  if (isKnownError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ThreatLibraryError(
      error.message,
      'INTERNAL_ERROR',
      500,
      { originalError: error.name }
    );
  }

  return new ThreatLibraryError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: String(error) }
  );
}
