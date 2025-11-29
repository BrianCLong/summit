/**
 * Custom error types for Model Hub Service
 */

export class ModelHubError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ModelHubError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class NotFoundError extends ModelHubError {
  constructor(entity: string, id: string, details?: Record<string, unknown>) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ModelHubError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends ModelHubError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends ModelHubError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ModelHubError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class PolicyViolationError extends ModelHubError {
  constructor(message: string, policyId?: string, details?: Record<string, unknown>) {
    super(message, 'POLICY_VIOLATION', 403, { policyId, ...details });
    this.name = 'PolicyViolationError';
  }
}

export class ApprovalRequiredError extends ModelHubError {
  constructor(modelVersionId: string, environment: string, details?: Record<string, unknown>) {
    super(
      `Model version ${modelVersionId} requires approval for ${environment} environment`,
      'APPROVAL_REQUIRED',
      403,
      { modelVersionId, environment, ...details },
    );
    this.name = 'ApprovalRequiredError';
  }
}

export class NoAvailableModelError extends ModelHubError {
  constructor(capability: string, tenantId: string, details?: Record<string, unknown>) {
    super(
      `No available model found for capability '${capability}' and tenant '${tenantId}'`,
      'NO_AVAILABLE_MODEL',
      503,
      { capability, tenantId, ...details },
    );
    this.name = 'NoAvailableModelError';
  }
}

export class EvaluationFailedError extends ModelHubError {
  constructor(evaluationId: string, reason: string, details?: Record<string, unknown>) {
    super(
      `Evaluation ${evaluationId} failed: ${reason}`,
      'EVALUATION_FAILED',
      400,
      { evaluationId, reason, ...details },
    );
    this.name = 'EvaluationFailedError';
  }
}

export class CircuitBreakerOpenError extends ModelHubError {
  constructor(modelVersionId: string, details?: Record<string, unknown>) {
    super(
      `Circuit breaker is open for model version ${modelVersionId}`,
      'CIRCUIT_BREAKER_OPEN',
      503,
      { modelVersionId, ...details },
    );
    this.name = 'CircuitBreakerOpenError';
  }
}
