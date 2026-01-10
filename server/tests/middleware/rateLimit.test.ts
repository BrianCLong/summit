import { rateLimitMiddleware } from '../../src/middleware/rateLimit.js';
import { rateLimiter } from '../../src/services/RateLimiter.js';
import quotaManager from '../../src/lib/resources/quota-manager.js';
import { quotaOverrideService } from '../../src/lib/resources/overrides/QuotaOverrideService.js';
import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';
import { useFakeTime } from '../_utils/timeHarness.js';

// Mock dependencies
jest.mock('../../src/services/RateLimiter.js');
jest.mock('../../src/lib/resources/quota-manager.js');
jest.mock('../../src/lib/resources/overrides/QuotaOverrideService.js');

describe('rateLimitMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let clock: ReturnType<typeof useFakeTime>;

  beforeAll(() => {
    // Hoist fake timers
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  beforeEach(() => {
    clock = useFakeTime(new Date('2025-01-01T00:00:00Z').getTime());

    req = {
      path: '/api/test',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      headers: {},
    } as any;

    res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    } as any;

    next = jest.fn();

    // Reset mocks
    (rateLimiter.checkLimit as unknown as jest.Mock).mockReturnValue(Promise.resolve({
      allowed: true,
      total: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }));

    // Mock QuotaManager defaults
    (quotaManager.getQuotaForTenant as unknown as jest.Mock).mockReturnValue({
        requestsPerMinute: 1000,
        tier: 'FREE'
    });

    // Mock QuotaOverrideService defaults
    (quotaOverrideService.hasOverride as unknown as jest.Mock).mockReturnValue(Promise.resolve(false));
  });

  afterEach(() => {
    clock.restore();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should apply tenant quota when tenant context is present', async () => {
    // Setup authenticated user with tenantId in context
    (req as any).tenant = {
      tenantId: 'TENANT_ALPHA',
    };
    (req as any).user = {
      id: 'user1',
    };

    // Mock QuotaManager specific return
    (quotaManager.getQuotaForTenant as unknown as jest.Mock).mockReturnValue({
      requestsPerMinute: 12000,
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(quotaManager.getQuotaForTenant).toHaveBeenCalledWith('TENANT_ALPHA');
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      expect.stringContaining('tenant:TENANT_ALPHA'),
      12000,
      60000
    );
    expect(next).toHaveBeenCalled();
  });

  it('should fall back to default limits if no tenant context', async () => {
    (req as any).user = {
      id: 'user2',
    };
    // No req.tenant

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(quotaManager.getQuotaForTenant).not.toHaveBeenCalled();
    // Default class limit is 60 (EndpointClass.DEFAULT)
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      expect.stringContaining('user:user2'),
      60,
      60000
    );
  });

  it('should block requests when limit exceeded and return correct retryAfter', async () => {
    (rateLimiter.checkLimit as unknown as jest.Mock).mockImplementation(async () => {
      return {
        allowed: false,
        total: 100,
        remaining: 0,
        reset: Date.now() + 10000,
      };
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      retryAfter: 10, // Deterministic check: (t0 + 10000 - t0) / 1000
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should reduce retryAfter as time advances', async () => {
    const resetTime = Date.now() + 10000;
    (rateLimiter.checkLimit as unknown as jest.Mock).mockImplementation(async () => {
      return {
        allowed: false,
        total: 100,
        remaining: 0,
        reset: resetTime,
      };
    });

    // Initial check
    await rateLimitMiddleware(req as Request, res as Response, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      retryAfter: 10,
    }));

    // Advance time by 4 seconds
    await clock.advanceMs(4000);
    (res.json as jest.Mock).mockClear();

    await rateLimitMiddleware(req as Request, res as Response, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      retryAfter: 6,
    }));
  });
});
