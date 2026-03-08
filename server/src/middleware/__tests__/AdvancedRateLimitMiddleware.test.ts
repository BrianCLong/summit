import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AdvancedRateLimiter, RateLimitTier } from '../TieredRateLimitMiddleware.js';

describe('AdvancedRateLimiter', () => {
  let limiter: AdvancedRateLimiter;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    limiter = new AdvancedRateLimiter({
      redis: { host: 'localhost', port: 6379 },
      enableTrafficShaping: false,
    });

    req = {
      headers: {},
      ip: '127.0.0.1',
      user: { id: 'u1', tier: RateLimitTier.FREE },
    };

    res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      on: jest.fn(),
      locals: {},
    };

    next = jest.fn();
  });

  test('allows request and sets free tier header', async () => {
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Quota-Remaining', '100');
  });

  test('identifies premium tier from user object', async () => {
    req.user.tier = RateLimitTier.PREMIUM;
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Quota-Remaining', '10000');
  });

  test('falls back to IP identity when user is absent', async () => {
    delete req.user;
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Quota-Remaining', '100');
  });
});
