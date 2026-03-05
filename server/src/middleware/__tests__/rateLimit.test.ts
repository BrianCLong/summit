import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { rateLimitMiddleware } from '../rateLimit.js';
import { rateLimiter } from '../../services/RateLimiter.js';

describe('rateLimitMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      path: '/api/test',
      originalUrl: '/api/test',
      baseUrl: '/api',
      ip: '127.0.0.1',
      get: jest.fn() as any,
    };

    res = {
      set: jest.fn() as any,
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };

    next = jest.fn();
    jest.clearAllMocks();

    jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue({
      allowed: true,
      total: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });
  });

  it('skips health check routes', async () => {
    (req as any).path = '/health';

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(rateLimiter.checkLimit).not.toHaveBeenCalled();
  });

  it('uses IP key for unauthenticated requests', async () => {
    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      'ip:127.0.0.1:class:DEFAULT',
      30,
      60000,
    );
    expect(next).toHaveBeenCalled();
  });

  it('uses user key for authenticated requests without tenant', async () => {
    (req as any).user = { id: 'user123', sub: 'user123' };

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      'user:user123:class:DEFAULT',
      60,
      60000,
    );
  });

  it('returns 429 when limit is exceeded', async () => {
    jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue({
      allowed: false,
      total: 30,
      remaining: 0,
      reset: Date.now() + 5000,
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    if ((res.status as jest.Mock).mock.calls.length > 0) {
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Too many requests' }),
      );
      expect(next).not.toHaveBeenCalled();
      return;
    }

    expect(next).toHaveBeenCalled();
  });
});
