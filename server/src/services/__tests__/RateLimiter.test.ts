import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

const store = new Map<string, { count: number; expiresAt: number }>();

// Mock Redis - declared before mock
const redisMock = {
  eval: jest.fn(async (_script: string, _keys: number, key: string, _points: number, windowMs: number) => {
    const now = Date.now();
    const currentEntry = store.get(key);

    if (!currentEntry || currentEntry.expiresAt <= now) {
      store.set(key, { count: 0, expiresAt: now + windowMs });
    }

    const entry = store.get(key)!;
    const updatedCount = entry.count + 1;
    store.set(key, { count: updatedCount, expiresAt: entry.expiresAt });

    return [updatedCount, entry.expiresAt - now];
  }),
};

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database.js', () => ({
  getRedisClient: () => redisMock,
}));

// Dynamic import AFTER mock is set up
const { RateLimiter } = await import('../RateLimiter.js');

describe('RateLimiter', () => {
  const limiter = new RateLimiter();

  beforeEach(() => {
    store.clear();
    jest.useFakeTimers();
    redisMock.eval.mockClear();
    redisMock.eval.mockImplementation(async (_script: string, _keys: number, key: string, _points: number, windowMs: number) => {
      const now = Date.now();
      const currentEntry = store.get(key);

      if (!currentEntry || currentEntry.expiresAt <= now) {
        store.set(key, { count: 0, expiresAt: now + windowMs });
      }

      const entry = store.get(key)!;
      const updatedCount = entry.count + 1;
      store.set(key, { count: updatedCount, expiresAt: entry.expiresAt });

      return [updatedCount, entry.expiresAt - now];
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    const result = await limiter.checkLimit('user:test', 3, 1000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.total).toBe(3);
    expect(result.reset).toBeGreaterThan(Date.now());
    expect(redisMock.eval).toHaveBeenCalledTimes(1);
  });

  it('blocks when the limit is exceeded and surfaces retry time', async () => {
    await limiter.checkLimit('ip:1.2.3.4', 1, 5000);
    const blocked = await limiter.consume('ip:1.2.3.4', 1, 1, 5000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(Date.now());
  });
});
