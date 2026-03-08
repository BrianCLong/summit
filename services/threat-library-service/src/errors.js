"use strict";
/**
 * Custom Error Classes for Threat Library Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenError = exports.UnauthorizedError = exports.TimeoutError = exports.ServiceUnavailableError = exports.InvalidPatternError = exports.PatternEvaluationError = exports.ConflictError = exports.ValidationError = exports.NotFoundError = exports.ThreatLibraryError = void 0;
exports.isKnownError = isKnownError;
exports.toThreatLibraryError = toThreatLibraryError;
/**
 * Base error class for threat library service
 */
class ThreatLibraryError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.name = 'ThreatLibraryError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}
exports.ThreatLibraryError = ThreatLibraryError;
/**
 * Resource not found error
 */
class NotFoundError extends ThreatLibraryError {
    constructor(resourceType, id, details) {
        super(`${resourceType} with id '${id}' not found`, 'RESOURCE_NOT_FOUND', 404, details);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Validation error for invalid input
 */
class ValidationError extends ThreatLibraryError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Conflict error for duplicate resources or version conflicts
 */
class ConflictError extends ThreatLibraryError {
    constructor(message, details) {
        super(message, 'CONFLICT', 409, details);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Pattern evaluation error
 */
class PatternEvaluationError extends ThreatLibraryError {
    constructor(message, patternId, details) {
        super(message, 'PATTERN_EVALUATION_ERROR', 500, { patternId, ...details });
        this.name = 'PatternEvaluationError';
    }
}
exports.PatternEvaluationError = PatternEvaluationError;
/**
 * Invalid pattern definition error
 */
class InvalidPatternError extends ThreatLibraryError {
    constructor(message, patternId, details) {
        super(message, 'INVALID_PATTERN', 400, { patternId, ...details });
        this.name = 'InvalidPatternError';
    }
}
exports.InvalidPatternError = InvalidPatternError;
/**
 * Service unavailable error
 */
class ServiceUnavailableError extends ThreatLibraryError {
    constructor(serviceName, details) {
        super(`Service '${serviceName}' is currently unavailable`, 'SERVICE_UNAVAILABLE', 503, details);
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Timeout error for long-running operations
 */
class TimeoutError extends ThreatLibraryError {
    constructor(operation, timeoutMs, details) {
        super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT', 408, details);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Authorization error
 */
class UnauthorizedError extends ThreatLibraryError {
    constructor(message = 'Unauthorized access', details) {
        super(message, 'UNAUTHORIZED', 401, details);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * Forbidden error for permission issues
 */
class ForbiddenError extends ThreatLibraryError {
    constructor(message = 'Access forbidden', resource, details) {
        super(message, 'FORBIDDEN', 403, { resource, ...details });
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Error handler utility for Express middleware
 */
function isKnownError(error) {
    return error instanceof ThreatLibraryError;
}
/**
 * Convert unknown error to ThreatLibraryError
 */
function toThreatLibraryError(error) {
    if (isKnownError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new ThreatLibraryError(error.message, 'INTERNAL_ERROR', 500, { originalError: error.name });
    }
    return new ThreatLibraryError('An unknown error occurred', 'UNKNOWN_ERROR', 500, { originalError: String(error) });
}
