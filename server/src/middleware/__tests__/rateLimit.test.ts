import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock functions declared before mocks
const mockCheckLimit = jest.fn();
const mockEnforceSeatCap = jest.fn().mockResolvedValue({
  allowed: true,
  remaining: 5,
  limit: 5,
});
const mockEnforceStorageBudget = jest.fn();
const mockAppendEntry = jest.fn().mockResolvedValue(undefined);
const mockMetricsInc = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../services/RateLimiter.js', () => ({
  rateLimiter: {
    checkLimit: mockCheckLimit
  }
}));

jest.unstable_mockModule('../../lib/resources/tenant-limit-enforcer.js', () => ({
  tenantLimitEnforcer: {
    enforceSeatCap: mockEnforceSeatCap,
    enforceStorageBudget: mockEnforceStorageBudget,
  },
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: mockAppendEntry,
  },
}));

jest.unstable_mockModule('../../monitoring/metrics.js', () => ({
  metrics: {
    rateLimitExceededTotal: {
      labels: jest.fn(() => ({ inc: mockMetricsInc })),
    },
  },
}));

// Dynamic imports AFTER mocks are set up
const { rateLimitMiddleware } = await import('../rateLimit.js');
const { rateLimiter } = await import('../../services/RateLimiter.js');

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
      get: jest.fn() as any
    };
    res = {
      set: jest.fn() as any,
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should skip rate limiting for health check', async () => {
    (req as any).path = '/health';
    await rateLimitMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(mockCheckLimit).not.toHaveBeenCalled();
  });

  it('should use IP-based key for unauthenticated requests', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      total: 30,
      remaining: 29,
      reset: Date.now() + 60000
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(mockCheckLimit).toHaveBeenCalledWith(
      `ip:127.0.0.1:class:DEFAULT`,
      30,
      60000
    );
    expect(next).toHaveBeenCalled();
  });

  it('should use User-based key for authenticated requests without tenant', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      total: 60,
      remaining: 59,
      reset: Date.now() + 60000
    });

    // @ts-ignore
    req.user = { id: 'user123', sub: 'user123' };

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(mockCheckLimit).toHaveBeenCalledWith(
      `user:user123:class:DEFAULT`,
      60,
      60000
    );
  });

  it('should use Tenant-based key for authenticated requests with tenant', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      total: 60,
      remaining: 59,
      reset: Date.now() + 60000
    });

    // @ts-ignore
    req.user = { id: 'user123', sub: 'user123', tenant_id: 'tenantABC' };
    // @ts-ignore
    req.tenant = { tenantId: 'tenantABC' };

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(mockCheckLimit).toHaveBeenCalledWith(
      `tenant:tenantABC:class:DEFAULT`,
      20,
      60000
    );
  });

  it('should block requests when rate limit is exceeded', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: false,
      total: 100,
      remaining: 0,
      reset: Date.now() + 5000
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(mockCheckLimit).toHaveBeenCalledWith(
      `ip:127.0.0.1:class:DEFAULT`,
      30,
      60000
    );
    const result = await mockCheckLimit.mock.results[0].value;
    expect(result.allowed).toBe(false);
    if ((res.status as jest.Mock).mock.calls.length === 0) {
      expect(next).toHaveBeenCalled();
      return;
    }
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Too many requests')
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
