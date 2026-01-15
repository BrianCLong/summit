import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock function declared before mock
const mockGetRedisClient = jest.fn(() => null);

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database.js', () => ({
  getRedisClient: mockGetRedisClient,
}));

// Dynamic import AFTER mock is set up
const { createRedisRateLimiter } = await import('../redisRateLimiter.js');

describe('createRedisRateLimiter fallback behavior', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: 0 });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const buildLimitedApp = () => {
    const app = express();
    app.use(
      createRedisRateLimiter({
        windowMs: 1000,
        max: 1,
        message: { error: 'limited' },
      }),
    );
    app.get('/limited', (_req, res) => res.json({ ok: true }));
    return app;
  };

  it('falls back to in-memory counting when Redis is unavailable', async () => {
    const app = buildLimitedApp();
    const agent = request(app);

    const first = await agent.get('/limited');
    expect(first.status).toBe(200);

    const second = await agent.get('/limited');
    expect(second.status).toBe(429);
    expect(second.body.error).toBe('limited');
  });

  it('resets counts after the configured window when using fallback store', async () => {
    const app = buildLimitedApp();
    const agent = request(app);

    await agent.get('/limited');
    await agent.get('/limited');

    jest.advanceTimersByTime(1100);

    const afterReset = await agent.get('/limited');
    expect(afterReset.status).toBe(200);
  });
});
