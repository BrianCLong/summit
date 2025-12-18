/**
 * Tests for error classes and utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  TimeoutError,
  CircuitBreakerError,
  InternalError,
  ServiceUnavailableError,
  toAppError,
  isOperationalError,
  sanitizeError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError(
        'VALIDATION_FAILED',
        'Custom message',
        { field: 'email' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toBe('Custom message');
      expect(error.httpStatus).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.traceId).toBeTruthy();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default message from error code', () => {
      const error = new AppError('RESOURCE_NOT_FOUND');

      expect(error.message).toBe('Requested resource not found');
    });

    it('should convert to response format', () => {
      const error = new AppError(
        'VALIDATION_FAILED',
        'Test error',
        { field: 'name' }
      );

      const response = error.toResponse('req-123', '/api/test');

      expect(response).toEqual({
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

    it('should convert to JSON for logging', () => {
      const cause = new Error('Underlying error');
      const error = new AppError('INTERNAL_SERVER_ERROR', 'Test', {}, cause);

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'AppError',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Test',
        httpStatus: 500,
        retryable: false,
      });
      expect(json.traceId).toBeTruthy();
      expect(json.timestamp).toBeTruthy();
      expect(json.cause).toBeTruthy();
      expect(json.cause.message).toBe('Underlying error');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid email', { field: 'email' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.httpStatus).toBe(400);
      expect(error.message).toBe('Invalid email');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('AUTH_TOKEN_EXPIRED', 'Token expired');

      expect(error.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(error.httpStatus).toBe(401);
      expect(error.message).toBe('Token expired');
    });

    it('should use default code', () => {
      const error = new AuthenticationError();

      expect(error.code).toBe('AUTH_FAILED');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError(
        'INSUFFICIENT_PERMISSIONS',
        'Admin required',
        { userId: '123', requiredRole: 'admin' }
      );

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.httpStatus).toBe(403);
      expect(error.message).toBe('Admin required');
      expect(error.details).toEqual({ userId: '123', requiredRole: 'admin' });
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource name', () => {
      const error = new NotFoundError('User', { id: '123' });

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.httpStatus).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.details).toEqual({ id: '123' });
    });

    it('should use default message without resource', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Requested resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Duplicate email', { email: 'test@example.com' });

      expect(error.code).toBe('RESOURCE_CONFLICT');
      expect(error.httpStatus).toBe(409);
      expect(error.message).toBe('Duplicate email');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const error = new RateLimitError(60, { limit: 100, current: 101 });

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.httpStatus).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({
        retryAfter: 60,
        limit: 100,
        current: 101,
      });
    });
  });

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const cause = new Error('Connection failed');
      const error = new DatabaseError(
        'POSTGRES_ERROR',
        'Query failed',
        { query: 'SELECT * FROM users' },
        cause
      );

      expect(error.code).toBe('POSTGRES_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.message).toBe('Query failed');
      expect(error.cause).toBe(cause);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with service name', () => {
      const error = new ExternalServiceError(
        'OPA_ERROR',
        'opa',
        'Policy engine unavailable',
        { status: 503 }
      );

      expect(error.code).toBe('OPA_ERROR');
      expect(error.httpStatus).toBe(502);
      expect(error.message).toBe('Policy engine unavailable');
      expect(error.details).toEqual({
        service: 'opa',
        status: 503,
      });
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with operation details', () => {
      const error = new TimeoutError('database.query', 5000, {
        query: 'SELECT * FROM users',
      });

      expect(error.code).toBe('OPERATION_TIMEOUT');
      expect(error.httpStatus).toBe(504);
      expect(error.message).toContain('database.query');
      expect(error.message).toContain('5000ms');
      expect(error.details).toEqual({
        operation: 'database.query',
        timeoutMs: 5000,
        query: 'SELECT * FROM users',
      });
    });
  });

  describe('CircuitBreakerError', () => {
    it('should create circuit breaker error with service name', () => {
      const error = new CircuitBreakerError('payment-gateway', {
        state: 'open',
        failures: 5,
      });

      expect(error.code).toBe('CIRCUIT_BREAKER_OPEN');
      expect(error.httpStatus).toBe(503);
      expect(error.message).toContain('payment-gateway');
      expect(error.details).toEqual({
        service: 'payment-gateway',
        state: 'open',
        failures: 5,
      });
    });
  });

  describe('InternalError', () => {
    it('should create internal error', () => {
      const cause = new Error('Unexpected error');
      const error = new InternalError('Something went wrong', {}, cause);

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.cause).toBe(cause);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create service unavailable error', () => {
      const error = new ServiceUnavailableError('Maintenance mode');

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.httpStatus).toBe(503);
      expect(error.retryable).toBe(true);
    });
  });
});

describe('Error Utilities', () => {
  describe('isOperationalError', () => {
    it('should return true for AppError', () => {
      const error = new AppError('VALIDATION_FAILED');

      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Something went wrong');

      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('should return AppError as-is', () => {
      const error = new ValidationError('Test');

      const result = toAppError(error);

      expect(result).toBe(error);
    });

    it('should convert Error to InternalError', () => {
      const error = new Error('Test error');

      const result = toAppError(error);

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('Test error');
      expect(result.cause).toBe(error);
    });

    it('should convert unknown to InternalError', () => {
      const result = toAppError('string error');

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('string error');
    });
  });

  describe('sanitizeError', () => {
    it('should return full details in development', () => {
      const error = new InternalError('Internal error', {
        sensitive: 'data',
      });

      const response = sanitizeError(error, false);

      expect(response.error.message).toBe('Internal error');
      expect(response.error.details).toEqual({ sensitive: 'data' });
    });

    it('should hide details for 5xx errors in production', () => {
      const error = new InternalError('Internal error', {
        sensitive: 'data',
      });

      const response = sanitizeError(error, true);

      expect(response.error.message).toBe('An internal error occurred');
      expect(response.error.details).toBeUndefined();
      expect(response.error.traceId).toBeTruthy();
    });

    it('should show details for 4xx errors in production', () => {
      const error = new ValidationError('Invalid email', {
        field: 'email',
      });

      const response = sanitizeError(error, true);

      expect(response.error.message).toBe('Invalid email');
      expect(response.error.details).toEqual({ field: 'email' });
    });
  });
});
