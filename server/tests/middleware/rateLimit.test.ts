
import { rateLimitMiddleware } from '../../src/middleware/rateLimit.js';
import { rateLimiter } from '../../src/services/RateLimiter.js';
import { quotaManager } from '../../src/lib/resources/quota-manager.js';
import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/services/RateLimiter.js');
jest.mock('../../src/lib/resources/quota-manager.js');

describe('rateLimitMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      path: '/api/test',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      headers: {},
    };
    res = {
      set: jest.fn() as any,
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();

    // Reset mocks
    (rateLimiter.checkLimit as jest.Mock).mockReturnValue(Promise.resolve({
      allowed: true,
      total: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }) as any);
  });

  it('should apply tenant quota for authenticated users with tenantId', async () => {
    // Setup authenticated user with tenantId
    (req as any).user = {
      id: 'user1',
      tenantId: 'TENANT_ALPHA',
    };

    // Mock QuotaManager
    (quotaManager.getRateLimitConfig as jest.Mock).mockReturnValue({
      limit: 12000,
      windowMs: 60000,
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(quotaManager.getRateLimitConfig).toHaveBeenCalledWith('TENANT_ALPHA');
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      expect.stringContaining('user:user1'),
      12000,
      60000
    );
    expect(next).toHaveBeenCalled();
  });

  it('should fall back to default authenticated limit if no tenantId', async () => {
    (req as any).user = {
      id: 'user2',
    };

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(quotaManager.getRateLimitConfig).not.toHaveBeenCalled();
    // Assuming cfg.RATE_LIMIT_MAX_AUTHENTICATED is default (1000)
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      expect.stringContaining('user:user2'),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should block requests when limit exceeded', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockReturnValue(Promise.resolve({
      allowed: false,
      total: 100,
      remaining: 0,
      reset: Date.now() + 10000,
    }) as any);

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });
});
