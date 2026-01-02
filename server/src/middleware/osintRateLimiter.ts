import { NextFunction, Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { getRedisClient } from '../config/database.js';
import { logger } from '../config/logger.js';

interface OsintRateLimiterOptions {
  windowMs?: number;
  userLimit?: number;
  ipLimit?: number;
  redisClient?: Redis | null;
}

type LimitScope = 'user' | 'ip';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  scope: LimitScope;
}

const DEFAULT_WINDOW_MS = Number(process.env.OSINT_RATE_LIMIT_WINDOW_MS || 60_000);
const DEFAULT_USER_LIMIT = Number(process.env.OSINT_RATE_LIMIT_PER_USER || 120);
const DEFAULT_IP_LIMIT = Number(process.env.OSINT_RATE_LIMIT_PER_IP || 180);
const KEY_PREFIX = 'osint:rate-limit:';

class SlidingWindowLimiter {
  private readonly windowMs: number;
  private readonly inMemoryHits: Map<string, number[]> = new Map();
  private readonly redis: Redis | null;

  constructor(windowMs: number, redisClient: Redis | null) {
    this.windowMs = windowMs;
    this.redis = redisClient;
  }

  async check(key: string, limit: number, scope: LimitScope): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      if (this.redis) {
        return await this.checkWithRedis(key, limit, now, windowStart, scope);
      }
      return this.checkInMemory(key, limit, now, windowStart, scope);
    } catch (error: any) {
      logger.warn({ err: error, key, scope }, 'Redis sliding window failed, falling back to memory');
      return this.checkInMemory(key, limit, now, windowStart, scope);
    }
  }

  private async checkWithRedis(
    key: string,
    limit: number,
    now: number,
    windowStart: number,
    scope: LimitScope,
  ): Promise<RateLimitResult> {
    const redisKey = `${KEY_PREFIX}${key}`;

    const pipeline = this.redis!.multi();
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart);
    pipeline.zcard(redisKey);
    pipeline.zrange(redisKey, 0, 0);
    const results = (await pipeline.exec()) as Array<[Error | null, number | string[]]>;

    const count = Number(results?.[1]?.[1] ?? 0);
    const oldestEntry = (results?.[2]?.[1] as string[] | undefined)?.[0];
    const oldestTimestamp = oldestEntry ? Number(oldestEntry) : now;

    if (count >= limit) {
      const retryMs = Math.max(0, oldestTimestamp + this.windowMs - now);
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryMs / 1000),
        scope,
      };
    }

    const memberId = `${now}-${Math.random()}`;
    const expirySeconds = Math.ceil((this.windowMs * 2) / 1000);
    await this.redis!.multi().zadd(redisKey, now, memberId).expire(redisKey, expirySeconds).exec();

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - count - 1),
      retryAfterSeconds: Math.ceil(this.windowMs / 1000),
      scope,
    };
  }

  private checkInMemory(
    key: string,
    limit: number,
    now: number,
    windowStart: number,
    scope: LimitScope,
  ): RateLimitResult {
    const hits = this.inMemoryHits.get(key) || [];
    const recent = hits.filter((timestamp) => timestamp >= windowStart);

    if (recent.length >= limit) {
      const oldestTimestamp = recent[0];
      const retryMs = Math.max(0, oldestTimestamp + this.windowMs - now);
      this.inMemoryHits.set(key, recent);
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryMs / 1000),
        scope,
      };
    }

    recent.push(now);
    this.inMemoryHits.set(key, recent);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - recent.length),
      retryAfterSeconds: Math.ceil(this.windowMs / 1000),
      scope,
    };
  }
}

export function createOsintRateLimiter(options: OsintRateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const userLimit = options.userLimit ?? DEFAULT_USER_LIMIT;
  const ipLimit = options.ipLimit ?? DEFAULT_IP_LIMIT;
  const redisClient = options.redisClient ?? getRedisClient();
  const limiter = new SlidingWindowLimiter(windowMs, redisClient);

  return async function osintRateLimiter(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user?.id || (req as any).user?.userId || (req as any).user?.sub;
    const ip = req.ip;

    const results: RateLimitResult[] = [];

    if (userId) {
      results.push(await limiter.check(`user:${userId}`, userLimit, 'user'));
    }

    results.push(await limiter.check(`ip:${ip}`, ipLimit, 'ip'));

    const exceeded = results.find((result) => !result.allowed);

    if (exceeded) {
      const { limit, retryAfterSeconds, scope } = exceeded;
      res
        .status(429)
        .setHeader('Retry-After', String(retryAfterSeconds))
        .json({
          success: false,
          error: 'rate_limited',
          message: `OSINT API ${scope} limit exceeded. Please retry after ${retryAfterSeconds} seconds.`,
          scope,
          limit,
          retryAfterSeconds,
        });
      return;
    }

    results.forEach((result) => {
      const headerPrefix = result.scope === 'user' ? 'X-UserRateLimit' : 'X-IPRateLimit';
      res.setHeader(`${headerPrefix}-Limit`, String(result.limit));
      res.setHeader(`${headerPrefix}-Remaining`, String(result.remaining));
      res.setHeader(`${headerPrefix}-Reset`, String(result.retryAfterSeconds));
    });

    next();
  };
}

export const osintRateLimiter = createOsintRateLimiter();
