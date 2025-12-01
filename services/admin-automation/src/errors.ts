/**
 * Custom error types for admin automation service.
 */

export class AdminAutomationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminAutomationError';
  }
}

export class CitizenNotFoundError extends AdminAutomationError {
  constructor(citizenId: string) {
    super(`Citizen not found: ${citizenId}`, 'CITIZEN_NOT_FOUND', { citizenId });
    this.name = 'CitizenNotFoundError';
  }
}

export class ProfileValidationError extends AdminAutomationError {
  constructor(
    message: string,
    public readonly validationErrors: Array<{ field: string; message: string }>,
  ) {
    super(message, 'PROFILE_VALIDATION_ERROR', { validationErrors });
    this.name = 'ProfileValidationError';
  }
}

export class ServiceNeedNotFoundError extends AdminAutomationError {
  constructor(needId: string) {
    super(`Service need not found: ${needId}`, 'SERVICE_NEED_NOT_FOUND', { needId });
    this.name = 'ServiceNeedNotFoundError';
  }
}

export class AutoResolveError extends AdminAutomationError {
  constructor(needId: string, reason: string) {
    super(`Cannot auto-resolve need ${needId}: ${reason}`, 'AUTO_RESOLVE_ERROR', { needId, reason });
    this.name = 'AutoResolveError';
  }
}

export class DatabaseError extends AdminAutomationError {
  constructor(operation: string, cause?: Error) {
    super(`Database error during ${operation}: ${cause?.message || 'Unknown'}`, 'DATABASE_ERROR', {
      operation,
      cause: cause?.message,
    });
    this.name = 'DatabaseError';
  }
}

/**
 * Type guard for AdminAutomationError
 */
export function isAdminAutomationError(error: unknown): error is AdminAutomationError {
  return error instanceof AdminAutomationError;
}

/**
 * Wraps async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isAdminAutomationError(error)) throw error;
    throw new DatabaseError(operation, error instanceof Error ? error : undefined);
  }
}
