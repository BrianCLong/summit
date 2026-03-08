"use strict";
/**
 * Custom error types for Model Hub Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerOpenError = exports.EvaluationFailedError = exports.NoAvailableModelError = exports.ApprovalRequiredError = exports.PolicyViolationError = exports.ForbiddenError = exports.UnauthorizedError = exports.ConflictError = exports.ValidationError = exports.NotFoundError = exports.ModelHubError = void 0;
class ModelHubError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
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
exports.ModelHubError = ModelHubError;
class NotFoundError extends ModelHubError {
    constructor(entity, id, details) {
        super(`${entity} not found: ${id}`, 'NOT_FOUND', 404, details);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends ModelHubError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends ModelHubError {
    constructor(message, details) {
        super(message, 'CONFLICT', 409, details);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class UnauthorizedError extends ModelHubError {
    constructor(message = 'Unauthorized', details) {
        super(message, 'UNAUTHORIZED', 401, details);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ModelHubError {
    constructor(message = 'Forbidden', details) {
        super(message, 'FORBIDDEN', 403, details);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class PolicyViolationError extends ModelHubError {
    constructor(message, policyId, details) {
        super(message, 'POLICY_VIOLATION', 403, { policyId, ...details });
        this.name = 'PolicyViolationError';
    }
}
exports.PolicyViolationError = PolicyViolationError;
class ApprovalRequiredError extends ModelHubError {
    constructor(modelVersionId, environment, details) {
        super(`Model version ${modelVersionId} requires approval for ${environment} environment`, 'APPROVAL_REQUIRED', 403, { modelVersionId, environment, ...details });
        this.name = 'ApprovalRequiredError';
    }
}
exports.ApprovalRequiredError = ApprovalRequiredError;
class NoAvailableModelError extends ModelHubError {
    constructor(capability, tenantId, details) {
        super(`No available model found for capability '${capability}' and tenant '${tenantId}'`, 'NO_AVAILABLE_MODEL', 503, { capability, tenantId, ...details });
        this.name = 'NoAvailableModelError';
    }
}
exports.NoAvailableModelError = NoAvailableModelError;
class EvaluationFailedError extends ModelHubError {
    constructor(evaluationId, reason, details) {
        super(`Evaluation ${evaluationId} failed: ${reason}`, 'EVALUATION_FAILED', 400, { evaluationId, reason, ...details });
        this.name = 'EvaluationFailedError';
    }
}
exports.EvaluationFailedError = EvaluationFailedError;
class CircuitBreakerOpenError extends ModelHubError {
    constructor(modelVersionId, details) {
        super(`Circuit breaker is open for model version ${modelVersionId}`, 'CIRCUIT_BREAKER_OPEN', 503, { modelVersionId, ...details });
        this.name = 'CircuitBreakerOpenError';
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
