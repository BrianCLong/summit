"use strict";
/**
 * Tests for error classes and utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const errors_1 = require("../errors");
(0, globals_1.describe)('Error Classes', () => {
    (0, globals_1.describe)('AppError', () => {
        (0, globals_1.it)('should create error with correct properties', () => {
            const error = new errors_1.AppError('VALIDATION_FAILED', 'Custom message', { field: 'email' });
            (0, globals_1.expect)(error).toBeInstanceOf(Error);
            (0, globals_1.expect)(error.code).toBe('VALIDATION_FAILED');
            (0, globals_1.expect)(error.message).toBe('Custom message');
            (0, globals_1.expect)(error.httpStatus).toBe(400);
            (0, globals_1.expect)(error.isOperational).toBe(true);
            (0, globals_1.expect)(error.retryable).toBe(false);
            (0, globals_1.expect)(error.details).toEqual({ field: 'email' });
            (0, globals_1.expect)(error.traceId).toBeTruthy();
            (0, globals_1.expect)(error.timestamp).toBeInstanceOf(Date);
        });
        (0, globals_1.it)('should use default message from error code', () => {
            const error = new errors_1.AppError('RESOURCE_NOT_FOUND');
            (0, globals_1.expect)(error.message).toBe('Requested resource not found');
        });
        (0, globals_1.it)('should convert to response format', () => {
            const error = new errors_1.AppError('VALIDATION_FAILED', 'Test error', { field: 'name' });
            const response = error.toResponse('req-123', '/api/test');
            (0, globals_1.expect)(response).toEqual({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Test error',
                    traceId: error.traceId,
                    timestamp: error.timestamp.toISOString(),
                    details: { field: 'name' },
                    path: '/api/test',
                    requestId: 'req-123',
                },
            });
        });
        (0, globals_1.it)('should convert to JSON for logging', () => {
            const cause = new Error('Underlying error');
            const error = new errors_1.AppError('INTERNAL_SERVER_ERROR', 'Test', {}, cause);
            const json = error.toJSON();
            (0, globals_1.expect)(json).toMatchObject({
                name: 'AppError',
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Test',
                httpStatus: 500,
                retryable: false,
            });
            (0, globals_1.expect)(json.traceId).toBeTruthy();
            (0, globals_1.expect)(json.timestamp).toBeTruthy();
            (0, globals_1.expect)(json.cause).toBeTruthy();
            (0, globals_1.expect)(json.cause.message).toBe('Underlying error');
        });
    });
    (0, globals_1.describe)('ValidationError', () => {
        (0, globals_1.it)('should create validation error', () => {
            const error = new errors_1.ValidationError('Invalid email', { field: 'email' });
            (0, globals_1.expect)(error).toBeInstanceOf(errors_1.AppError);
            (0, globals_1.expect)(error.code).toBe('VALIDATION_FAILED');
            (0, globals_1.expect)(error.httpStatus).toBe(400);
            (0, globals_1.expect)(error.message).toBe('Invalid email');
            (0, globals_1.expect)(error.details).toEqual({ field: 'email' });
        });
    });
    (0, globals_1.describe)('AuthenticationError', () => {
        (0, globals_1.it)('should create authentication error', () => {
            const error = new errors_1.AuthenticationError('AUTH_TOKEN_EXPIRED', 'Token expired');
            (0, globals_1.expect)(error.code).toBe('AUTH_TOKEN_EXPIRED');
            (0, globals_1.expect)(error.httpStatus).toBe(401);
            (0, globals_1.expect)(error.message).toBe('Token expired');
        });
        (0, globals_1.it)('should use default code', () => {
            const error = new errors_1.AuthenticationError();
            (0, globals_1.expect)(error.code).toBe('AUTH_FAILED');
        });
    });
    (0, globals_1.describe)('AuthorizationError', () => {
        (0, globals_1.it)('should create authorization error', () => {
            const error = new errors_1.AuthorizationError('INSUFFICIENT_PERMISSIONS', 'Admin required', { userId: '123', requiredRole: 'admin' });
            (0, globals_1.expect)(error.code).toBe('INSUFFICIENT_PERMISSIONS');
            (0, globals_1.expect)(error.httpStatus).toBe(403);
            (0, globals_1.expect)(error.message).toBe('Admin required');
            (0, globals_1.expect)(error.details).toEqual({ userId: '123', requiredRole: 'admin' });
        });
    });
    (0, globals_1.describe)('NotFoundError', () => {
        (0, globals_1.it)('should create not found error with resource name', () => {
            const error = new errors_1.NotFoundError('User', { id: '123' });
            (0, globals_1.expect)(error.code).toBe('RESOURCE_NOT_FOUND');
            (0, globals_1.expect)(error.httpStatus).toBe(404);
            (0, globals_1.expect)(error.message).toBe('User not found');
            (0, globals_1.expect)(error.details).toEqual({ id: '123' });
        });
        (0, globals_1.it)('should use default message without resource', () => {
            const error = new errors_1.NotFoundError();
            (0, globals_1.expect)(error.message).toBe('Requested resource not found');
        });
    });
    (0, globals_1.describe)('ConflictError', () => {
        (0, globals_1.it)('should create conflict error', () => {
            const error = new errors_1.ConflictError('Duplicate email', { email: 'test@example.com' });
            (0, globals_1.expect)(error.code).toBe('RESOURCE_CONFLICT');
            (0, globals_1.expect)(error.httpStatus).toBe(409);
            (0, globals_1.expect)(error.message).toBe('Duplicate email');
        });
    });
    (0, globals_1.describe)('RateLimitError', () => {
        (0, globals_1.it)('should create rate limit error with retry after', () => {
            const error = new errors_1.RateLimitError(60, { limit: 100, current: 101 });
            (0, globals_1.expect)(error.code).toBe('RATE_LIMIT_EXCEEDED');
            (0, globals_1.expect)(error.httpStatus).toBe(429);
            (0, globals_1.expect)(error.retryable).toBe(true);
            (0, globals_1.expect)(error.details).toEqual({
                retryAfter: 60,
                limit: 100,
                current: 101,
            });
        });
    });
    (0, globals_1.describe)('DatabaseError', () => {
        (0, globals_1.it)('should create database error', () => {
            const cause = new Error('Connection failed');
            const error = new errors_1.DatabaseError('POSTGRES_ERROR', 'Query failed', { query: 'SELECT * FROM users' }, cause);
            (0, globals_1.expect)(error.code).toBe('POSTGRES_ERROR');
            (0, globals_1.expect)(error.httpStatus).toBe(500);
            (0, globals_1.expect)(error.message).toBe('Query failed');
            (0, globals_1.expect)(error.cause).toBe(cause);
        });
    });
    (0, globals_1.describe)('ExternalServiceError', () => {
        (0, globals_1.it)('should create external service error with service name', () => {
            const error = new errors_1.ExternalServiceError('OPA_ERROR', 'opa', 'Policy engine unavailable', { status: 503 });
            (0, globals_1.expect)(error.code).toBe('OPA_ERROR');
            (0, globals_1.expect)(error.httpStatus).toBe(502);
            (0, globals_1.expect)(error.message).toBe('Policy engine unavailable');
            (0, globals_1.expect)(error.details).toEqual({
                service: 'opa',
                status: 503,
            });
        });
    });
    (0, globals_1.describe)('TimeoutError', () => {
        (0, globals_1.it)('should create timeout error with operation details', () => {
            const error = new errors_1.TimeoutError('database.query', 5000, {
                query: 'SELECT * FROM users',
            });
            (0, globals_1.expect)(error.code).toBe('OPERATION_TIMEOUT');
            (0, globals_1.expect)(error.httpStatus).toBe(504);
            (0, globals_1.expect)(error.message).toContain('database.query');
            (0, globals_1.expect)(error.message).toContain('5000ms');
            (0, globals_1.expect)(error.details).toEqual({
                operation: 'database.query',
                timeoutMs: 5000,
                query: 'SELECT * FROM users',
            });
        });
    });
    (0, globals_1.describe)('CircuitBreakerError', () => {
        (0, globals_1.it)('should create circuit breaker error with service name', () => {
            const error = new errors_1.CircuitBreakerError('payment-gateway', {
                state: 'open',
                failures: 5,
            });
            (0, globals_1.expect)(error.code).toBe('CIRCUIT_BREAKER_OPEN');
            (0, globals_1.expect)(error.httpStatus).toBe(503);
            (0, globals_1.expect)(error.message).toContain('payment-gateway');
            (0, globals_1.expect)(error.details).toEqual({
                service: 'payment-gateway',
                state: 'open',
                failures: 5,
            });
        });
    });
    (0, globals_1.describe)('InternalError', () => {
        (0, globals_1.it)('should create internal error', () => {
            const cause = new Error('Unexpected error');
            const error = new errors_1.InternalError('Something went wrong', {}, cause);
            (0, globals_1.expect)(error.code).toBe('INTERNAL_SERVER_ERROR');
            (0, globals_1.expect)(error.httpStatus).toBe(500);
            (0, globals_1.expect)(error.cause).toBe(cause);
        });
    });
    (0, globals_1.describe)('ServiceUnavailableError', () => {
        (0, globals_1.it)('should create service unavailable error', () => {
            const error = new errors_1.ServiceUnavailableError('Maintenance mode');
            (0, globals_1.expect)(error.code).toBe('SERVICE_UNAVAILABLE');
            (0, globals_1.expect)(error.httpStatus).toBe(503);
            (0, globals_1.expect)(error.retryable).toBe(true);
        });
    });
});
(0, globals_1.describe)('Error Utilities', () => {
    (0, globals_1.describe)('isOperationalError', () => {
        (0, globals_1.it)('should return true for AppError', () => {
            const error = new errors_1.AppError('VALIDATION_FAILED');
            (0, globals_1.expect)((0, errors_1.isOperationalError)(error)).toBe(true);
        });
        (0, globals_1.it)('should return false for regular Error', () => {
            const error = new Error('Something went wrong');
            (0, globals_1.expect)((0, errors_1.isOperationalError)(error)).toBe(false);
        });
    });
    (0, globals_1.describe)('toAppError', () => {
        (0, globals_1.it)('should return AppError as-is', () => {
            const error = new errors_1.ValidationError('Test');
            const result = (0, errors_1.toAppError)(error);
            (0, globals_1.expect)(result).toBe(error);
        });
        (0, globals_1.it)('should convert Error to InternalError', () => {
            const error = new Error('Test error');
            const result = (0, errors_1.toAppError)(error);
            (0, globals_1.expect)(result).toBeInstanceOf(errors_1.InternalError);
            (0, globals_1.expect)(result.message).toBe('Test error');
            (0, globals_1.expect)(result.cause).toBe(error);
        });
        (0, globals_1.it)('should convert unknown to InternalError', () => {
            const result = (0, errors_1.toAppError)('string error');
            (0, globals_1.expect)(result).toBeInstanceOf(errors_1.InternalError);
            (0, globals_1.expect)(result.message).toBe('string error');
        });
    });
    (0, globals_1.describe)('sanitizeError', () => {
        (0, globals_1.it)('should return full details in development', () => {
            const error = new errors_1.InternalError('Internal error', {
                sensitive: 'data',
            });
            const response = (0, errors_1.sanitizeError)(error, false);
            (0, globals_1.expect)(response.error.message).toBe('Internal error');
            (0, globals_1.expect)(response.error.details).toEqual({ sensitive: 'data' });
        });
        (0, globals_1.it)('should hide details for 5xx errors in production', () => {
            const error = new errors_1.InternalError('Internal error', {
                sensitive: 'data',
            });
            const response = (0, errors_1.sanitizeError)(error, true);
            (0, globals_1.expect)(response.error.message).toBe('An internal error occurred');
            (0, globals_1.expect)(response.error.details).toBeUndefined();
            (0, globals_1.expect)(response.error.traceId).toBeTruthy();
        });
        (0, globals_1.it)('should show details for 4xx errors in production', () => {
            const error = new errors_1.ValidationError('Invalid email', {
                field: 'email',
            });
            const response = (0, errors_1.sanitizeError)(error, true);
            (0, globals_1.expect)(response.error.message).toBe('Invalid email');
            (0, globals_1.expect)(response.error.details).toEqual({ field: 'email' });
        });
    });
});
