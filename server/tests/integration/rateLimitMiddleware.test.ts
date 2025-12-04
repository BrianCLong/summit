import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from '../../src/middleware/rateLimit';

// Mock getRedisClient to return a fake Redis client
// This tests Middleware -> RateLimiter -> (Mock)Redis
const mockRedis = {
  eval: jest.fn<any>(),
  call: jest.fn<any>(),
};

jest.mock('../../src/config/database.js', () => ({
  getRedisClient: () => mockRedis,
}));

// We need to unmock RateLimiter if it was automatically mocked by previous tests
jest.unmock('../../src/services/RateLimiter');

describe('Rate Limit Middleware Integration (with Redis Mock)', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mock auth middleware for some tests
    app.use((req: Request, res: Response, next: NextFunction) => {
      const userId = req.headers['x-user-id'];
      if (userId) {
        (req as any).user = { id: userId, sub: userId };
      }
      next();
    });

    app.use(rateLimitMiddleware);
    app.get('/', (req, res) => res.send('ok'));
    app.get('/api/ai/test', (req, res) => res.send('ai ok'));
  });

  it('should allow request when Redis returns low count', async () => {
    // Redis returns [current_count, ttl]
    mockRedis.eval.mockResolvedValue([1, 60000]);

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.header['x-ratelimit-remaining']).toBeDefined();
    expect(mockRedis.eval).toHaveBeenCalled();
  });

  it('should block request when Redis returns count > limit', async () => {
    // Redis returns [current_count=1001, ttl=5000]
    // Default IP limit is 1000 in .env/config
    mockRedis.eval.mockResolvedValue([1001, 5000]);

    const res = await request(app).get('/');

    expect(res.status).toBe(429);
    expect(res.header['retry-after']).toBeDefined();
    expect(Number(res.header['retry-after'])).toBeGreaterThan(0);
    expect(res.body.error).toMatch(/Too many requests/);
  });

  it('should prioritize authenticated user limits', async () => {
    // Authenticated limit is 1000
    // Redis returns 500
    mockRedis.eval.mockResolvedValue([500, 60000]);

    const res = await request(app)
      .get('/')
      .set('x-user-id', 'test-user-123');

    expect(res.status).toBe(200);
    // Verify we used the user key
    expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.anything(), // script
        1, // numKeys
        expect.stringContaining('rate_limit:user:test-user-123'),
        expect.any(Number) // windowMs
    );
  });

  it('should apply stricter limits for AI endpoints', async () => {
    // AI limit is 1000 / 5 = 200
    // Redis returns 201
    mockRedis.eval.mockResolvedValue([201, 60000]);

    const res = await request(app).get('/api/ai/test');

    expect(res.status).toBe(429);
    expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.anything(),
        1,
        expect.stringMatching(/rate_limit:ip:.*:ai/),
        expect.any(Number)
    );
  });

  it('should handle Redis failure gracefully (fail open)', async () => {
    mockRedis.eval.mockRejectedValue(new Error('Redis is down'));

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
  });
});
