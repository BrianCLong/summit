import rateLimit, { type Store, type Options, type IncrementResponse } from 'express-rate-limit';
import type { Redis } from 'ioredis';
import { getRedisClient } from '../config/database.js';

class RedisStore implements Store {
  private readonly client: Redis | null;
  private readonly windowMs: number;
  private readonly prefix: string;
  private readonly fallbackHits = new Map<string, { count: number; reset: number }>();

  constructor(windowMs: number, prefix = 'express-rate-limit:') {
    this.windowMs = windowMs;
    this.client = getRedisClient();
    this.prefix = prefix;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redisKey = `${this.prefix}${key}`;
    const resetTime = new Date(Date.now() + this.windowMs);

    if (!this.client) {
      const existing = this.fallbackHits.get(redisKey);
      const nowMs = Date.now();
      if (!existing || existing.reset < nowMs) {
        this.fallbackHits.set(redisKey, { count: 1, reset: nowMs + this.windowMs });
        return { totalHits: 1, resetTime };
      }
      existing.count += 1;
      this.fallbackHits.set(redisKey, existing);
      return { totalHits: existing.count, resetTime: new Date(existing.reset) };
    }

    const multi = this.client.multi();
    multi.incr(redisKey);
    multi.pttl(redisKey);
    const results = (await multi.exec()) as Array<[Error | null, number]>;
    const current = results[0]?.[1] ?? 1;
    const ttl = results[1]?.[1] ?? -1;

    if (ttl === -1) {
      await this.client.pexpire(redisKey, this.windowMs);
    }

    const expiresIn = ttl > 0 ? ttl : this.windowMs;
    const reset = new Date(Date.now() + expiresIn);

    return { totalHits: current, resetTime: reset };
  }

  async decrement(key: string): Promise<void> {
    if (!this.client) {
      const redisKey = `${this.prefix}${key}`;
      const entry = this.fallbackHits.get(redisKey);
      if (entry) {
        entry.count = Math.max(0, entry.count - 1);
        this.fallbackHits.set(redisKey, entry);
      }
      return;
    }
    const redisKey = `${this.prefix}${key}`;
    await this.client.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;
    if (!this.client) {
      this.fallbackHits.delete(redisKey);
      return;
    }
    await this.client.del(redisKey);
  }

  async resetAll(): Promise<void> {
    if (!this.client) {
      this.fallbackHits.clear();
      return;
    }
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length) await this.client.del(keys);
  }
}

export function createRedisRateLimiter(options: Options): ReturnType<typeof rateLimit> {
  const store = new RedisStore(options.windowMs ?? 60000);
  return rateLimit({
    ...options,
    store,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
