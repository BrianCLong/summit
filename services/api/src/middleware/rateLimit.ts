import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';
import { redisClient } from '../db/redis.js';
import { rateLimitMetrics } from '../observability/rateLimitMetrics.js';
import { logger } from '../utils/logger.js';

type BucketType = 'apiKey' | 'user' | 'ip';

type RateLimitSource = 'redis' | 'memory';

interface RedisLike {
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  pexpire(key: string, ttl: number): Promise<number>;
  zcard(key: string): Promise<number>;
  pttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  set(key: string, value: string, mode: 'PX', ttl: number): Promise<'OK' | null>;
  zrem(key: string, member: string): Promise<number>;
}

export interface RateLimitConfig {
  windowMs: number;
  userLimit: number;
  ipLimit: number;
  defaultApiKeyLimit: number;
  apiKeyQuotas: Record<string, number>;
  alertThreshold: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  circuitBreaker: {
    failureThreshold: number;
    openMs: number;
    resetMs: number;
  };
}

interface RateLimitRequest {
  identifier: string;
  endpoint: string;
  bucketType: BucketType;
  apiKey?: string;
  weight?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
  backoffMs: number;
  bucketType: BucketType;
  source: RateLimitSource;
}

const defaultConfig: RateLimitConfig = {
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  userLimit: Number(process.env.RATE_LIMIT_USER_LIMIT || 120),
  ipLimit: Number(process.env.RATE_LIMIT_IP_LIMIT || 60),
  defaultApiKeyLimit: Number(process.env.RATE_LIMIT_API_KEY_LIMIT || 200),
  apiKeyQuotas: safeParseQuotaMap(process.env.RATE_LIMIT_API_KEY_QUOTAS),
  alertThreshold: Number(process.env.RATE_LIMIT_ALERT_THRESHOLD || 0.8),
  baseBackoffMs: Number(process.env.RATE_LIMIT_BACKOFF_BASE_MS || 500),
  maxBackoffMs: Number(process.env.RATE_LIMIT_BACKOFF_MAX_MS || 60_000),
  circuitBreaker: {
    failureThreshold: Number(process.env.RATE_LIMIT_CB_FAILURES || 5),
    openMs: Number(process.env.RATE_LIMIT_CB_OPEN_MS || 30_000),
    resetMs: Number(process.env.RATE_LIMIT_CB_RESET_MS || 5_000),
  },
};

function safeParseQuotaMap(json?: string): Record<string, number> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, Number(value)]),
      );
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to parse RATE_LIMIT_API_KEY_QUOTAS');
  }
  return {};
}

export const rateLimitAlerter = new EventEmitter();

export class SlidingWindowRateLimiter {
  private readonly redis?: RedisLike;
  private readonly memoryWindows = new Map<string, number[]>();
  private readonly memoryViolations = new Map<string, number>();
  private readonly config: RateLimitConfig;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(config: RateLimitConfig = defaultConfig, redis?: RedisLike) {
    this.config = config;
    this.redis = redis;
  }

  async consume(request: RateLimitRequest): Promise<RateLimitDecision> {
    const start = performance.now();
    const client = this.getClient();
    try {
      const decision = client
        ? await this.consumeWithRedis(request, client)
        : await this.consumeInMemory(request);
      this.resetCircuit();
      rateLimitMetrics.latency.observe({ source: decision.source }, performance.now() - start);
      return decision;
    } catch (error) {
      this.recordFailure(error);
      const decision = await this.consumeInMemory(request);
      rateLimitMetrics.latency.observe({ source: 'memory' }, performance.now() - start);
      return decision;
    }
  }

  private getClient(): RedisLike | null {
    const now = Date.now();
    if (now < this.circuitOpenUntil) {
      rateLimitMetrics.circuitOpen.set(1);
      return null;
    }

    if (this.redis) {
      return this.redis;
    }

    try {
      return redisClient.getClient();
    } catch (error) {
      this.recordFailure(error);
      return null;
    }
  }

  private resetCircuit(): void {
    if (this.consecutiveFailures !== 0 || this.circuitOpenUntil !== 0) {
      rateLimitMetrics.circuitOpen.set(0);
    }
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure(error: unknown): void {
    this.consecutiveFailures += 1;
    logger.warn({ error, consecutiveFailures: this.consecutiveFailures }, 'Rate limit Redis failure');

    if (this.consecutiveFailures >= this.config.circuitBreaker.failureThreshold) {
      this.circuitOpenUntil = Date.now() + this.config.circuitBreaker.openMs;
      rateLimitMetrics.circuitOpen.set(1);
      logger.error(
        {
          error,
          openMs: this.config.circuitBreaker.openMs,
        },
        'Opening rate limiter circuit breaker and failing open to in-memory mode',
      );
    }
  }

  private async consumeWithRedis(
    request: RateLimitRequest,
    client: RedisLike,
  ): Promise<RateLimitDecision> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const bucketKey = this.buildBucketKey(request);
    const violationKey = `${bucketKey}:violations`;
    const backoffKey = `${bucketKey}:backoff`;
    const memberId = `${request.identifier}:${now}:${Math.random()}`;
    const limit = this.resolveLimit(request);

    const backoffTtl = await client.pttl(backoffKey);
    if (backoffTtl > 0) {
      rateLimitMetrics.blocked.inc({
        bucket: request.bucketType,
        source: 'redis',
        reason: 'backoff',
        endpoint: request.endpoint,
      });
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfterMs: backoffTtl,
        backoffMs: backoffTtl,
        bucketType: request.bucketType,
        source: 'redis',
      };
    }

    await client.zremrangebyscore(bucketKey, 0, windowStart);
    await client.zadd(bucketKey, now, memberId);
    await client.pexpire(bucketKey, this.config.windowMs);

    const count = await client.zcard(bucketKey);
    const remaining = Math.max(limit - count, 0);
    const utilization = count / limit;

    if (utilization >= this.config.alertThreshold) {
      rateLimitAlerter.emit('saturation', {
        bucket: request.bucketType,
        identifier: request.identifier,
        utilization,
        endpoint: request.endpoint,
      });
    }

    if (count > limit) {
      await client.zrem(bucketKey, memberId);
      const violations = await client.incr(violationKey);
      await client.pexpire(violationKey, this.config.windowMs);
      const backoffMs = Math.min(
        this.config.baseBackoffMs * 2 ** Math.max(0, violations - 1),
        this.config.maxBackoffMs,
      );
      await client.set(backoffKey, '1', 'PX', backoffMs);
      rateLimitMetrics.blocked.inc({
        bucket: request.bucketType,
        source: 'redis',
        reason: 'limit',
        endpoint: request.endpoint,
      });
      rateLimitMetrics.backoff.observe(
        { bucket: request.bucketType, endpoint: request.endpoint },
        backoffMs,
      );
      rateLimitAlerter.emit('violation', {
        bucket: request.bucketType,
        identifier: request.identifier,
        endpoint: request.endpoint,
        limit,
        attempted: count,
        backoffMs,
      });
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfterMs: backoffMs,
        backoffMs,
        bucketType: request.bucketType,
        source: 'redis',
      };
    }

    rateLimitMetrics.allowed.inc({
      bucket: request.bucketType,
      source: 'redis',
      endpoint: request.endpoint,
    });

    return {
      allowed: true,
      remaining,
      limit,
      retryAfterMs: 0,
      backoffMs: 0,
      bucketType: request.bucketType,
      source: 'redis',
    };
  }

  private async consumeInMemory(request: RateLimitRequest): Promise<RateLimitDecision> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const bucketKey = this.buildBucketKey(request);
    const limit = this.resolveLimit(request);
    const backoffKey = `${bucketKey}:backoff`;

    const backoffRemaining = this.memoryBackoffTtl(backoffKey, now);
    if (backoffRemaining > 0) {
      rateLimitMetrics.blocked.inc({
        bucket: request.bucketType,
        source: 'memory',
        reason: 'backoff',
        endpoint: request.endpoint,
      });
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfterMs: backoffRemaining,
        backoffMs: backoffRemaining,
        bucketType: request.bucketType,
        source: 'memory',
      };
    }

    const window = this.memoryWindows.get(bucketKey) || [];
    const filtered = window.filter((timestamp) => timestamp >= windowStart);
    filtered.push(now);
    this.memoryWindows.set(bucketKey, filtered);

    const count = filtered.length;
    const remaining = Math.max(limit - count, 0);

    if (count > limit) {
      filtered.pop();
      const violations = (this.memoryViolations.get(bucketKey) || 0) + 1;
      this.memoryViolations.set(bucketKey, violations);
      const backoffMs = Math.min(
        this.config.baseBackoffMs * 2 ** Math.max(0, violations - 1),
        this.config.maxBackoffMs,
      );
      this.memoryWindows.set(`${backoffKey}:expires`, [now + backoffMs]);
      rateLimitMetrics.blocked.inc({
        bucket: request.bucketType,
        source: 'memory',
        reason: 'limit',
        endpoint: request.endpoint,
      });
      rateLimitMetrics.backoff.observe(
        { bucket: request.bucketType, endpoint: request.endpoint },
        backoffMs,
      );
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfterMs: backoffMs,
        backoffMs,
        bucketType: request.bucketType,
        source: 'memory',
      };
    }

    rateLimitMetrics.allowed.inc({
      bucket: request.bucketType,
      source: 'memory',
      endpoint: request.endpoint,
    });

    return {
      allowed: true,
      remaining,
      limit,
      retryAfterMs: 0,
      backoffMs: 0,
      bucketType: request.bucketType,
      source: 'memory',
    };
  }

  private memoryBackoffTtl(key: string, now: number): number {
    const [expires] = this.memoryWindows.get(`${key}:expires`) || [];
    if (!expires) return 0;
    const ttl = expires - now;
    return ttl > 0 ? ttl : 0;
  }

  private buildBucketKey(request: RateLimitRequest): string {
    return `ratelimit:${request.bucketType}:${request.identifier}`;
  }

  private resolveLimit(request: RateLimitRequest): number {
    if (request.bucketType === 'apiKey') {
      if (request.apiKey && this.config.apiKeyQuotas[request.apiKey]) {
        return this.config.apiKeyQuotas[request.apiKey];
      }
      return this.config.defaultApiKeyLimit;
    }
    if (request.bucketType === 'user') {
      return this.config.userLimit;
    }
    return this.config.ipLimit;
  }
}

const limiter = new SlidingWindowRateLimiter();

rateLimitAlerter.on('violation', (payload) => {
  logger.warn({
    message: 'Rate limit violation',
    ...payload,
  });
});

rateLimitAlerter.on('saturation', (payload) => {
  logger.warn({
    message: 'Rate limit saturation warning',
    ...payload,
  });
});

function extractIdentity(req: Request) {
  const forwardedFor = (req.headers['x-forwarded-for'] as string) || '';
  const ip = forwardedFor.split(',')[0]?.trim() || req.ip;
  const apiKey = (req.headers['x-api-key'] as string) || undefined;
  const userId = (req as any).user?.id || (req.headers['x-user-id'] as string);
  return { ip, apiKey, userId };
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const { ip, apiKey, userId } = extractIdentity(req);
  const bucketType: BucketType = apiKey
    ? 'apiKey'
    : userId
      ? 'user'
      : 'ip';
  const identifier = apiKey || userId || ip || 'anonymous';
  const endpoint = req.path || 'unknown';

  limiter
    .consume({
      identifier,
      endpoint,
      bucketType,
      apiKey: apiKey || undefined,
      weight: 1,
    })
    .then((decision) => {
      res.setHeader('X-RateLimit-Limit', decision.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(decision.remaining, 0));
      res.setHeader(
        'X-RateLimit-Reset',
        Math.ceil((Date.now() + decision.retryAfterMs) / 1000),
      );
      if (decision.retryAfterMs > 0) {
        res.setHeader('Retry-After', Math.ceil(decision.retryAfterMs / 1000));
      }

      if (!decision.allowed) {
        res.status(429).json({
          error: 'rate_limited',
          bucket: decision.bucketType,
          retryAfterMs: decision.retryAfterMs,
          backoffMs: decision.backoffMs,
        });
        return;
      }

      next();
    })
    .catch((error) => {
      logger.error({ error }, 'Unhandled rate limit middleware error');
      next();
    });
}

export { limiter as rateLimiter };
