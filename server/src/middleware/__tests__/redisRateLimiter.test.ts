import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// Mock function declared before mock
const mockGetRedisClient = jest.fn(() => null);

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database.js', () => ({
  getRedisClient: mockGetRedisClient,
}));

describe('createRedisRateLimiter fallback behavior', () => {
  let createRedisRateLimiter: typeof import('../redisRateLimiter.js').createRedisRateLimiter;

  beforeAll(async () => {
    ({ createRedisRateLimiter } = await import('../redisRateLimiter.js'));
  });

  beforeAll(() => {
    jest.useFakeTimers({ now: 0 });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const buildLimiter = () =>
    createRedisRateLimiter({
      windowMs: 1000,
      max: 1,
      message: { error: 'limited' },
    });

  const runRequest = async (middleware: ReturnType<typeof createRedisRateLimiter>) => {
    const req = { ip: '127.0.0.1', headers: {}, method: 'GET', path: '/limited' } as any;
    let statusCode = 200;
    let body: any;
    const headers: Record<string, string> = {};
    let resolved = false;
    let resolvePromise: () => void = () => {};
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (payload: any) => {
        body = payload;
        if (!resolved) {
          resolved = true;
          resolvePromise();
        }
        return res;
      },
      send: (payload: any) => {
        body = payload;
        if (!resolved) {
          resolved = true;
          resolvePromise();
        }
        return res;
      },
      setHeader: (key: string, value: string) => {
        headers[key.toLowerCase()] = value;
      },
    } as any;

    await new Promise<void>((resolve) => {
      resolvePromise = resolve;
      middleware(req, res, () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });
    });

    return { statusCode, body, headers };
  };

  it('falls back to in-memory counting when Redis is unavailable', async () => {
    const limiter = buildLimiter();

    const first = await runRequest(limiter);
    expect(first.statusCode).toBe(200);

    const second = await runRequest(limiter);
    expect(second.statusCode).toBe(429);
    expect(second.body.error).toBe('limited');
  });

  it('resets counts after the configured window when using fallback store', async () => {
    const limiter = buildLimiter();

    await runRequest(limiter);
    await runRequest(limiter);

    jest.advanceTimersByTime(1100);

    const afterReset = await runRequest(limiter);
    expect(afterReset.statusCode).toBe(200);
  });
});
