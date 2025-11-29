/**
 * Middleware Tests
 * Tests for error handling and request processing
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorHandler, notFoundHandler, createError } from '../middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle Zod validation errors', () => {
      const schema = z.object({ name: z.string() });
      let zodError: ZodError;

      try {
        schema.parse({ name: 123 });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(
        zodError!,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: expect.any(Array),
          }),
        })
      );
    });

    it('should handle errors with statusCode', () => {
      const error = createError('Custom error', 422, 'CUSTOM_ERROR');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error',
        },
      });
    });

    it('should handle "not found" errors', () => {
      const error = new Error('Article not found');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
      });
    });

    it('should handle permission errors', () => {
      const error = new Error('Only the article owner can update');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the article owner can update',
        },
      });
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid content type');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid content type',
        },
      });
    });

    it('should handle unknown errors as 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with route info', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/unknown';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Route POST /api/v1/unknown not found',
        },
      });
    });
  });

  describe('createError', () => {
    it('should create error with statusCode and code', () => {
      const error = createError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should create error without code', () => {
      const error = createError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
    });
  });
});
