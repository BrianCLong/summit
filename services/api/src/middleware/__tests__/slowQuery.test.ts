/**
 * Tests for Slow Query Logger Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request, Response, NextFunction } from 'express';
import { slowQueryLogger } from '../slowQuery.js';

describe('slowQueryLogger', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let consoleWarnSpy: jest.SpyInstance;
  let finishHandlers: Array<() => void>;

  beforeEach(() => {
    finishHandlers = [];

    mockReq = {
      path: '/graphql',
    };

    mockRes = {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        if (event === 'finish') {
          finishHandlers.push(handler);
        }
        return mockRes as Response;
      }),
    };

    mockNext = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    delete process.env.SLOW_QUERY_MS;
  });

  describe('Disabled State', () => {
    it('should skip logging when SLOW_QUERY_MS is not set', () => {
      delete process.env.SLOW_QUERY_MS;

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('should skip logging when SLOW_QUERY_MS is 0', () => {
      process.env.SLOW_QUERY_MS = '0';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('should skip logging when SLOW_QUERY_MS is empty string', () => {
      process.env.SLOW_QUERY_MS = '';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });
  });

  describe('Enabled State', () => {
    beforeEach(() => {
      process.env.SLOW_QUERY_MS = '100';
    });

    it('should register finish handler when enabled', () => {
      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should not log when query is faster than threshold', async () => {
      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      // Simulate fast response (no delay)
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log when query exceeds threshold', async () => {
      process.env.SLOW_QUERY_MS = '10';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      // Simulate slow response
      await new Promise((resolve) => setTimeout(resolve, 20));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);

      expect(loggedData).toMatchObject({
        level: 'warn',
        type: 'slow_query',
        path: '/graphql',
        status: 200,
      });
      expect(loggedData.ms).toBeGreaterThanOrEqual(10);
    });

    it('should only log GraphQL queries', async () => {
      process.env.SLOW_QUERY_MS = '1';
      mockReq.path = '/api/health';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log GraphQL queries at different paths', async () => {
      process.env.SLOW_QUERY_MS = '1';
      mockReq.path = '/graphql/v2';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should include response status code in log', async () => {
      process.env.SLOW_QUERY_MS = '1';
      mockRes.statusCode = 500;

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));
      finishHandlers.forEach((handler) => handler());

      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(loggedData.status).toBe(500);
    });

    it('should measure execution time accurately', async () => {
      process.env.SLOW_QUERY_MS = '50';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      const delay = 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);

      // Allow for some timing variance
      expect(loggedData.ms).toBeGreaterThanOrEqual(delay - 10);
      expect(loggedData.ms).toBeLessThan(delay + 50);
    });

    it('should log exact threshold value', async () => {
      process.env.SLOW_QUERY_MS = '50';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 50));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should not log just under threshold', async () => {
      process.env.SLOW_QUERY_MS = '100';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      // No delay - should be well under 100ms
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid SLOW_QUERY_MS value gracefully', () => {
      process.env.SLOW_QUERY_MS = 'invalid';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('should handle negative SLOW_QUERY_MS value', () => {
      process.env.SLOW_QUERY_MS = '-100';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('should handle very large threshold values', async () => {
      process.env.SLOW_QUERY_MS = '999999';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple concurrent requests', async () => {
      process.env.SLOW_QUERY_MS = '10';

      const requests = Array.from({ length: 5 }, () => ({
        req: { ...mockReq } as Request,
        res: {
          ...mockRes,
          on: jest.fn((event, handler) => {
            if (event === 'finish') {
              finishHandlers.push(handler);
            }
            return mockRes as Response;
          }),
        } as Partial<Response>,
        next: jest.fn(),
      }));

      requests.forEach(({ req, res, next }) => {
        slowQueryLogger(req, res as Response, next);
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Log Format', () => {
    it('should output valid JSON', async () => {
      process.env.SLOW_QUERY_MS = '1';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));
      finishHandlers.forEach((handler) => handler());

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];

      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should include all required fields in log', async () => {
      process.env.SLOW_QUERY_MS = '1';

      slowQueryLogger(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));
      finishHandlers.forEach((handler) => handler());

      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);

      expect(loggedData).toHaveProperty('level');
      expect(loggedData).toHaveProperty('type');
      expect(loggedData).toHaveProperty('ms');
      expect(loggedData).toHaveProperty('path');
      expect(loggedData).toHaveProperty('status');
    });
  });
});
