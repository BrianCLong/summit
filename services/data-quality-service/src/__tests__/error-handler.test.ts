/**
 * Error Handler Middleware Tests
 */

import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ValidationErrorResponse,
  InternalServerError,
} from '../middleware/error-handler.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError(400, 'Test error', true, { detail: 'test' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error');
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ detail: 'test' });
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error', () => {
      const error = new NotFoundError('User', '123');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User with id 123 not found');
    });

    it('should create a 404 error without id', () => {
      const error = new NotFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });
  });

  describe('BadRequestError', () => {
    it('should create a 400 error', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should include details', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = new BadRequestError('Validation failed', details);

      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create a 401 error', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a 403 error', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('ValidationErrorResponse', () => {
    it('should create a validation error with details', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];
      const error = new ValidationErrorResponse(errors);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(errors);
    });
  });

  describe('InternalServerError', () => {
    it('should create a 500 error', () => {
      const error = new InternalServerError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.isOperational).toBe(false);
    });

    it('should accept custom message and details', () => {
      const error = new InternalServerError('Database error', { code: 'DB_ERROR' });

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database error');
      expect(error.details).toEqual({ code: 'DB_ERROR' });
    });
  });
});
