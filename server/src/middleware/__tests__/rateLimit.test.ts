import { rateLimitMiddleware } from '../rateLimit.js';
import { rateLimiter } from '../../services/RateLimiter.js';
import { cfg } from '../../config.js';
import { Request, Response, NextFunction } from 'express';

// Mock the rateLimiter service
jest.mock('../../services/RateLimiter.js', () => ({
  rateLimiter: {
    checkLimit: jest.fn()
  }
}));

// Mock config if necessary (though usually importing it works if it's a value)
// If cfg is a live binding that fails, we might need to mock it too.
// For now, let's assume imports work but we need to fix relative paths.

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
      get: jest.fn()
    };
    res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should skip rate limiting for health check', async () => {
    // Cast to any to allow writing to read-only property for test
    (req as any).path = '/health';
    await rateLimitMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(rateLimiter.checkLimit).not.toHaveBeenCalled();
  });

  it('should use IP-based key for unauthenticated requests', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      total: 100,
      remaining: 99,
      reset: Date.now() + 60000
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      `ip:127.0.0.1`,
      cfg.RATE_LIMIT_MAX_REQUESTS,
      cfg.RATE_LIMIT_WINDOW_MS
    );
    expect(next).toHaveBeenCalled();
  });

  it('should use User-based key for authenticated requests without tenant', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      total: 100,
      remaining: 99,
      reset: Date.now() + 60000
    });

    // @ts-ignore
    req.user = { id: 'user123', sub: 'user123' };

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      `user:user123`,
      cfg.RATE_LIMIT_MAX_AUTHENTICATED,
      cfg.RATE_LIMIT_WINDOW_MS
    );
  });

  it('should use Tenant-based key for authenticated requests with tenant', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      total: 100,
      remaining: 99,
      reset: Date.now() + 60000
    });

    // @ts-ignore
    req.user = { id: 'user123', sub: 'user123', tenant_id: 'tenantABC' };

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      `tenant:tenantABC:user:user123`,
      cfg.RATE_LIMIT_MAX_AUTHENTICATED,
      cfg.RATE_LIMIT_WINDOW_MS
    );
  });

  it('should block requests when rate limit is exceeded', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      total: 100,
      remaining: 0,
      reset: Date.now() + 5000
    });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Too many requests')
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
