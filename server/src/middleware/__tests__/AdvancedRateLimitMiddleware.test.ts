import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, test } from '@jest/globals';

// Mock Redis - declared before mock
const mockRedisInstance = {
  defineCommand: jest.fn(),
  on: jest.fn(),
  consumeTokenBucket: jest.fn().mockImplementation((_key: string, _rate: number, _cap: number, _cost: number) => {
    // Mock logic: always allow unless explicitly set to fail
    if ((global as any).failNextTokenCheck) {
      return [0, 0, 1000];
    }
    return [1, 100, 0];
  }),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(0),
  get: jest.fn().mockImplementation((key: string) => {
    if (key.includes('cost')) return Promise.resolve((global as any).mockCost || '0');
    return Promise.resolve('0');
  }),
  expire: jest.fn(),
  incrbyfloat: jest.fn(),
  hmget: jest.fn().mockResolvedValue(['100', '100000']),
  disconnect: jest.fn(),
};

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRedisInstance),
}));

// Dynamic imports AFTER mocks are set up
const { AdvancedRateLimiter, RateLimitTier } = await import('../TieredRateLimitMiddleware.js');

describe('AdvancedRateLimiter', () => {
  let limiter: InstanceType<typeof AdvancedRateLimiter>;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    limiter = new AdvancedRateLimiter({
      redis: { host: 'localhost', port: 6379 },
      enableTrafficShaping: false, // disable for simple unit tests
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
    (global as any).failNextTokenCheck = false;
    (global as any).mockCost = '0';
  });

  test('should allow request within limits', async () => {
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-RateLimit-Tier': 'free',
    }));
  });

  test('should reject request when token bucket exhausted', async () => {
    (global as any).failNextTokenCheck = true;
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Rate limit exceeded',
    }));
  });

  test('should reject request when daily quota exhausted', async () => {
    (global as any).mockCost = '1000000'; // Exceeds all limits
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Daily quota exceeded',
    }));
  });

  test('should identify user tier from object', async () => {
    req.user.tier = RateLimitTier.PREMIUM;
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-RateLimit-Tier': 'premium',
    }));
  });

  test('should fallback to IP if no user', async () => {
    delete req.user;
    const middleware = limiter.middleware();
    await middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-RateLimit-Tier': 'free',
    }));
  });
});
