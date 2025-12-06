import { SlidingWindowRateLimiter, type RateLimitConfig } from '../rateLimit.js';

type Member = { score: number; member: string };

type ValueRecord = { value: string; expiresAt?: number };

class FakeRedis {
  private sets = new Map<string, Member[]>();
  private kv = new Map<string, ValueRecord>();

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const set = this.sets.get(key) || [];
    const filtered = set.filter((entry) => entry.score > max || entry.score < min);
    this.sets.set(key, filtered);
    return set.length - filtered.length;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const set = this.sets.get(key) || [];
    set.push({ score, member });
    this.sets.set(key, set);
    return 1;
  }

  async pexpire(key: string, ttl: number): Promise<number> {
    const record = this.kv.get(key) || { value: '' };
    record.expiresAt = Date.now() + ttl;
    this.kv.set(key, record);
    return 1;
  }

  async zcard(key: string): Promise<number> {
    return (this.sets.get(key) || []).length;
  }

  async pttl(key: string): Promise<number> {
    const record = this.kv.get(key);
    if (!record?.expiresAt) return -1;
    const ttl = record.expiresAt - Date.now();
    return ttl > 0 ? ttl : -2;
  }

  async incr(key: string): Promise<number> {
    const current = Number(this.kv.get(key)?.value || '0') + 1;
    this.kv.set(key, { value: String(current) });
    return current;
  }

  async set(key: string, value: string, _mode: 'PX', ttl: number): Promise<'OK'> {
    this.kv.set(key, { value, expiresAt: Date.now() + ttl });
    return 'OK';
  }

  async zrem(key: string, member: string): Promise<number> {
    const set = this.sets.get(key) || [];
    const filtered = set.filter((entry) => entry.member !== member);
    this.sets.set(key, filtered);
    return set.length - filtered.length;
  }
}

class ErrorRedis extends FakeRedis {
  async zadd(): Promise<number> {
    throw new Error('redis unavailable');
  }
}

const baseConfig: RateLimitConfig = {
  windowMs: 1_000,
  userLimit: 2,
  ipLimit: 1,
  defaultApiKeyLimit: 3,
  apiKeyQuotas: { premium: 10 },
  alertThreshold: 0.8,
  baseBackoffMs: 100,
  maxBackoffMs: 1_000,
  circuitBreaker: { failureThreshold: 1, openMs: 5_000, resetMs: 1_000 },
};

describe('SlidingWindowRateLimiter', () => {
  it('allows traffic within limit and decrements remaining', async () => {
    const limiter = new SlidingWindowRateLimiter(baseConfig, new FakeRedis());

    const first = await limiter.consume({
      identifier: 'user-1',
      endpoint: '/graphql',
      bucketType: 'user',
    });

    const second = await limiter.consume({
      identifier: 'user-1',
      endpoint: '/graphql',
      bucketType: 'user',
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks callers that exceed the window and applies backoff', async () => {
    const limiter = new SlidingWindowRateLimiter(baseConfig, new FakeRedis());

    await limiter.consume({ identifier: 'ip-1', endpoint: '/api', bucketType: 'ip' });
    const blocked = await limiter.consume({ identifier: 'ip-1', endpoint: '/api', bucketType: 'ip' });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.backoffMs).toBeGreaterThan(0);
  });

  it('honors API-key specific quotas', async () => {
    const limiter = new SlidingWindowRateLimiter(baseConfig, new FakeRedis());

    const requests = await Promise.all([
      limiter.consume({ identifier: 'premium', endpoint: '/graphql', bucketType: 'apiKey', apiKey: 'premium' }),
      limiter.consume({ identifier: 'premium', endpoint: '/graphql', bucketType: 'apiKey', apiKey: 'premium' }),
      limiter.consume({ identifier: 'premium', endpoint: '/graphql', bucketType: 'apiKey', apiKey: 'premium' }),
    ]);

    expect(requests.every((r) => r.allowed)).toBe(true);
    expect(requests[2].limit).toBe(10);
  });

  it('fails open to in-memory mode when Redis errors', async () => {
    const limiter = new SlidingWindowRateLimiter(baseConfig, new ErrorRedis());
    const decision = await limiter.consume({
      identifier: 'user-2',
      endpoint: '/graphql',
      bucketType: 'user',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe('memory');
  });
});
