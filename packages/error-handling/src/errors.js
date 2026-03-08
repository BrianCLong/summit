"use strict";
/**
 * Standardized Error Classes for Summit Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.InternalError = exports.CircuitBreakerError = exports.TimeoutError = exports.ExternalServiceError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.isOperationalError = isOperationalError;
exports.toAppError = toAppError;
exports.sanitizeError = sanitizeError;
const node_crypto_1 = require("node:crypto");
const error_codes_js_1 = require("./error-codes.js");
/**
 * Base application error class
 */
class AppError extends Error {
    code;
    httpStatus;
    traceId;
    timestamp;
    isOperational;
    retryable;
    details;
    cause;
    constructor(code, message, details, cause) {
        const errorDef = error_codes_js_1.ErrorCodes[code];
        super(message || errorDef.message);
        this.name = 'AppError';
        this.code = code;
        this.httpStatus = errorDef.httpStatus;
        this.traceId = (0, node_crypto_1.randomUUID)();
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
    toResponse(requestId, path) {
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
exports.AppError = AppError;
/**
 * Validation error - for input validation failures
 */
class ValidationError extends AppError {
    constructor(message, details, cause) {
        super('VALIDATION_FAILED', message, details, cause);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error - for auth failures
 */
class AuthenticationError extends AppError {
    constructor(code = 'AUTH_FAILED', message, details) {
        super(code, message, details);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error - for permission failures
 */
class AuthorizationError extends AppError {
    constructor(code = 'FORBIDDEN', message, details) {
        super(code, message, details);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not found error
 */
class NotFoundError extends AppError {
    constructor(resource, details) {
        const message = resource
            ? `${resource} not found`
            : error_codes_js_1.ErrorCodes.RESOURCE_NOT_FOUND.message;
        super('RESOURCE_NOT_FOUND', message, details);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Conflict error - for duplicate resources, etc.
 */
class ConflictError extends AppError {
    constructor(message, details) {
        super('RESOURCE_CONFLICT', message, details);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Rate limit error
 */
class RateLimitError extends AppError {
    constructor(retryAfter, details) {
        const detailsWithRetry = retryAfter
            ? { ...details, retryAfter }
            : details;
        super('RATE_LIMIT_EXCEEDED', undefined, detailsWithRetry);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Database error
 */
class DatabaseError extends AppError {
    constructor(code, message, details, cause) {
        super(code, message, details, cause);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
/**
 * External service error
 */
class ExternalServiceError extends AppError {
    constructor(code, serviceName, message, details, cause) {
        const detailsWithService = { ...details, service: serviceName };
        super(code, message, detailsWithService, cause);
        this.name = 'ExternalServiceError';
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Timeout error
 */
class TimeoutError extends AppError {
    constructor(operation, timeoutMs, details) {
        const detailsWithTimeout = { ...details, operation, timeoutMs };
        super('OPERATION_TIMEOUT', `${operation} timed out after ${timeoutMs}ms`, detailsWithTimeout);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Circuit breaker open error
 */
class CircuitBreakerError extends AppError {
    constructor(serviceName, details) {
        const detailsWithService = { ...details, service: serviceName };
        super('CIRCUIT_BREAKER_OPEN', `Circuit breaker open for ${serviceName}`, detailsWithService);
        this.name = 'CircuitBreakerError';
    }
}
exports.CircuitBreakerError = CircuitBreakerError;
/**
 * Internal server error - for unexpected errors
 */
class InternalError extends AppError {
    constructor(message, details, cause) {
        super('INTERNAL_SERVER_ERROR', message, details, cause);
        this.name = 'InternalError';
    }
}
exports.InternalError = InternalError;
/**
 * Service unavailable error
 */
class ServiceUnavailableError extends AppError {
    constructor(message, details) {
        super('SERVICE_UNAVAILABLE', message, details);
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Check if error is operational (expected) vs programming error
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}
/**
 * Convert unknown error to AppError
 */
function toAppError(error) {
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
function sanitizeError(error, isProduction) {
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
