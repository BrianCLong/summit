/**
 * Error Types and Validation Utilities
 * Provides structured errors for better debugging and API responses
 */

/**
 * Base error class for collaboration service
 */
export class CollaborationError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CollaborationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
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
export class NotFoundError extends CollaborationError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends CollaborationError {
  readonly field?: string;

  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends CollaborationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Conflict error (e.g., duplicate, expired)
 */
export class ConflictError extends CollaborationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends CollaborationError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super('Rate limit exceeded', 'RATE_LIMITED', 429, { retryAfterMs });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Integrity violation error
 */
export class IntegrityError extends CollaborationError {
  constructor(message: string, missionId: string, details?: Record<string, unknown>) {
    super(message, 'INTEGRITY_VIOLATION', 500, { missionId, ...details });
    this.name = 'IntegrityError';
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

/**
 * Validate recommendation input
 */
export function validateRecommendationInput(input: {
  missionId?: string;
  action?: string;
  actionType?: string;
  parameters?: unknown;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!input.missionId || typeof input.missionId !== 'string') {
    errors.push({ field: 'missionId', message: 'missionId is required and must be a string' });
  }

  if (!input.action || typeof input.action !== 'string') {
    errors.push({ field: 'action', message: 'action is required and must be a string' });
  }

  if (!input.actionType || typeof input.actionType !== 'string') {
    errors.push({ field: 'actionType', message: 'actionType is required and must be a string' });
  }

  if (input.parameters !== undefined && typeof input.parameters !== 'object') {
    errors.push({ field: 'parameters', message: 'parameters must be an object' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate decision input
 */
export function validateDecisionInput(input: {
  recommendationId?: string;
  outcome?: string;
  reason?: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!input.recommendationId || typeof input.recommendationId !== 'string') {
    errors.push({ field: 'recommendationId', message: 'recommendationId is required' });
  }

  const validOutcomes = ['accepted', 'rejected', 'modified', 'deferred'];
  if (!input.outcome || !validOutcomes.includes(input.outcome)) {
    errors.push({
      field: 'outcome',
      message: `outcome must be one of: ${validOutcomes.join(', ')}`,
    });
  }

  if (!input.reason || typeof input.reason !== 'string' || input.reason.length < 3) {
    errors.push({ field: 'reason', message: 'reason is required and must be at least 3 characters' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate feedback input
 */
export function validateFeedbackInput(input: {
  recommendationId?: string;
  rating?: number;
  wasCorrect?: boolean;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!input.recommendationId || typeof input.recommendationId !== 'string') {
    errors.push({ field: 'recommendationId', message: 'recommendationId is required' });
  }

  if (typeof input.rating !== 'number' || input.rating < 1 || input.rating > 5) {
    errors.push({ field: 'rating', message: 'rating must be a number between 1 and 5' });
  }

  if (typeof input.wasCorrect !== 'boolean') {
    errors.push({ field: 'wasCorrect', message: 'wasCorrect must be a boolean' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate commander permissions
 */
export function validateCommander(commander: {
  id?: string;
  role?: string;
  permissions?: string[];
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!commander.id || typeof commander.id !== 'string') {
    errors.push({ field: 'commander.id', message: 'commander id is required' });
  }

  if (!commander.role || typeof commander.role !== 'string') {
    errors.push({ field: 'commander.role', message: 'commander role is required' });
  }

  if (!Array.isArray(commander.permissions)) {
    errors.push({ field: 'commander.permissions', message: 'commander permissions must be an array' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Assert validation passes or throw
 */
export function assertValid(result: ValidationResult): void {
  if (!result.valid) {
    const message = result.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new ValidationError(message, result.errors[0]?.field, { errors: result.errors });
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof CollaborationError) {
        throw error;
      }

      // Wrap unknown errors
      throw new CollaborationError(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        500,
        { originalError: String(error) }
      );
    }
  };
}
