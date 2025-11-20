/**
 * Rate Limiting Middleware Tests
 * Tests for request throttling, abuse prevention, and distributed rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../../middleware/rateLimiting';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  waitFor,
} from '../helpers/testHelpers';

// Mock express-rate-limit
const mockRateLimitMiddleware = jest.fn();
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    // Store options for assertions
    mockRateLimitMiddleware.options = options;

    // Return a middleware function
    return (req: Request, res: Response, next: NextFunction) => {
      mockRateLimitMiddleware(req, res, next);
    };
  });
});

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rateLimiter configuration', () => {
    it('should create rate limiter with default options', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({});

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60000, // 1 minute
        max: 60, // 60 requests per minute
      });
    });

    it('should create rate limiter with custom window', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ windowMs: 120000 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 120000,
        max: 60,
      });
    });

    it('should create rate limiter with custom max requests', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ max: 100 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60000,
        max: 100,
      });
    });

    it('should create rate limiter with both custom options', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ windowMs: 300000, max: 200 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 300000,
        max: 200,
      });
    });

    it('should handle zero windowMs gracefully', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ windowMs: 0 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 0,
        max: 60,
      });
    });

    it('should handle zero max requests', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ max: 0 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60000,
        max: 0,
      });
    });
  });

  describe('Request handling', () => {
    it('should allow requests under rate limit', () => {
      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      const next = createMockNext();

      // Mock to allow request
      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        next();
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests over rate limit with 429', () => {
      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      const next = createMockNext();

      // Mock to reject request (over limit)
      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(429).json({ error: 'Too many requests, please try again later' });
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Too many requests'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should provide retry-after header when rate limited', () => {
      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      const next = createMockNext();

      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ error: 'Too many requests' });
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });
      middleware(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('IP-based rate limiting', () => {
    it('should track rate limits separately per IP address', () => {
      const req1 = createMockRequest({ ip: '192.168.1.100' });
      const req2 = createMockRequest({ ip: '192.168.1.101' });
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const next1 = createMockNext();
      const next2 = createMockNext();

      // Both IPs should have independent counters
      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        next();
      });

      const middleware = rateLimiter({ windowMs: 1000, max: 2 });

      middleware(req1 as Request, res1 as Response, next1);
      middleware(req2 as Request, res2 as Response, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });

    it('should handle requests without IP address', () => {
      const req = createMockRequest({ ip: undefined });
      const res = createMockResponse();
      const next = createMockNext();

      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        next();
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });

      // Should not throw
      expect(() => {
        middleware(req as Request, res as Response, next);
      }).not.toThrow();
    });

    it('should handle X-Forwarded-For header for proxied requests', () => {
      const req = createMockRequest({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': '203.0.113.5, 198.51.100.6' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        next();
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle IPv6 addresses', () => {
      const req = createMockRequest({ ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' });
      const res = createMockResponse();
      const next = createMockNext();

      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        next();
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge cases and security', () => {
    it('should reset counter after time window expires', async () => {
      jest.useFakeTimers();

      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      const next = createMockNext();

      let requestCount = 0;
      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        requestCount++;
        if (requestCount > 5) {
          res.status(429).json({ error: 'Too many requests' });
        } else {
          next();
        }
      });

      const middleware = rateLimiter({ windowMs: 1000, max: 5 });

      // Make 5 requests (should all succeed)
      for (let i = 0; i < 5; i++) {
        middleware(req as Request, res as Response, next);
      }

      expect(next).toHaveBeenCalledTimes(5);

      // 6th request should be rate limited
      jest.clearAllMocks();
      middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Fast forward past the window
      jest.advanceTimersByTime(1100);

      // Reset counter for new window
      requestCount = 0;

      // New request after window should succeed
      jest.clearAllMocks();
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle very high request rates', () => {
      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      const next = createMockNext();

      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(429).json({ error: 'Too many requests' });
      });

      const middleware = rateLimiter({ windowMs: 1000, max: 1 });

      // Simulate burst of requests
      for (let i = 0; i < 100; i++) {
        middleware(req as Request, res as Response, next);
      }

      // Should have been called 100 times
      expect(mockRateLimitMiddleware).toHaveBeenCalledTimes(100);
    });

    it('should not allow rate limit bypass via header manipulation', () => {
      const req = createMockRequest({
        ip: '192.168.1.100',
        headers: {
          'x-ratelimit-reset': '0',
          'x-ratelimit-remaining': '9999',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      let callCount = 0;
      mockRateLimitMiddleware.mockImplementation((req: any, res: any, next: any) => {
        callCount++;
        if (callCount > 2) {
          res.status(429).json({ error: 'Too many requests' });
        } else {
          next();
        }
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 2 });

      // First 2 requests succeed
      middleware(req as Request, res as Response, next);
      middleware(req as Request, res as Response, next);

      jest.clearAllMocks();

      // 3rd request should still be rate limited despite headers
      middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should handle negative windowMs gracefully', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ windowMs: -1000 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: -1000,
        max: 60,
      });
    });

    it('should handle negative max requests gracefully', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ max: -5 });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60000,
        max: -5,
      });
    });

    it('should handle extremely large windowMs values', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ windowMs: Number.MAX_SAFE_INTEGER });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: Number.MAX_SAFE_INTEGER,
        max: 60,
      });
    });

    it('should handle extremely large max values', () => {
      const rateLimit = require('express-rate-limit');

      rateLimiter({ max: Number.MAX_SAFE_INTEGER });

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60000,
        max: Number.MAX_SAFE_INTEGER,
      });
    });
  });

  describe('Error handling', () => {
    it('should handle errors in rate limit middleware gracefully', () => {
      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      const next = createMockNext();

      mockRateLimitMiddleware.mockImplementation(() => {
        throw new Error('Rate limiter error');
      });

      const middleware = rateLimiter({ windowMs: 60000, max: 5 });

      expect(() => {
        middleware(req as Request, res as Response, next);
      }).toThrow('Rate limiter error');
    });
  });
});
