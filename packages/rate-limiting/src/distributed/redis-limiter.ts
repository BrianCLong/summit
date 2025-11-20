/**
 * Distributed Rate Limiter using Redis
 *
 * Enables rate limiting across multiple instances
 */

import Redis from 'ioredis';
import { RateLimiter, RateLimitConfig, RateLimitResult } from '../rate-limiter.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('redis-limiter');

export interface RedisLimiterConfig extends RateLimitConfig {
  redis: Redis | {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export class RedisRateLimiter extends RateLimiter {
  private redis: Redis;
  private ownRedis: boolean = false;

  constructor(config: RedisLimiterConfig) {
    super(config);

    if (config.redis instanceof Redis) {
      this.redis = config.redis;
    } else {
      this.redis = new Redis(config.redis);
      this.ownRedis = true;
    }
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    const fullKey = this.getKey(key);
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowEnd = windowStart + this.config.windowMs;

    // Use Redis Lua script for atomic operations
    const script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window_end = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      local current = redis.call('incr', key)

      if current == 1 then
        redis.call('pexpireat', key, window_end)
      end

      return {current, limit, window_end}
    `;

    try {
      const result = await this.redis.eval(
        script,
        1,
        fullKey,
        this.config.maxRequests,
        windowEnd,
        now
      ) as [number, number, number];

      const [current, limit, resetTime] = result;
      const allowed = current <= limit;

      const rateLimitResult: RateLimitResult = {
        allowed,
        info: {
          limit,
          current,
          remaining: Math.max(0, limit - current),
          resetTime,
        },
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      };

      this.logRateLimit(key, rateLimitResult);
      return rateLimitResult;

    } catch (error) {
      logger.error('Redis rate limit check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open - allow the request if Redis is unavailable
      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          current: 0,
          remaining: this.config.maxRequests,
          resetTime: windowEnd,
        },
      };
    }
  }

  async resetLimit(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    await this.redis.del(fullKey);
  }

  async close(): Promise<void> {
    if (this.ownRedis) {
      await this.redis.quit();
    }
  }

  // Distributed sliding window implementation
  async checkSlidingWindow(key: string): Promise<RateLimitResult> {
    const fullKey = this.getKey(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])

      -- Remove old entries
      redis.call('zremrangebyscore', key, 0, window_start)

      -- Count current requests
      local current = redis.call('zcard', key)

      -- Check limit
      if current < limit then
        redis.call('zadd', key, now, now)
        redis.call('pexpire', key, ttl)
        current = current + 1
      end

      -- Get oldest request for reset time
      local oldest = redis.call('zrange', key, 0, 0, 'WITHSCORES')
      local reset_time = now + ttl
      if #oldest > 0 then
        reset_time = tonumber(oldest[2]) + ttl
      end

      return {current, limit, reset_time}
    `;

    try {
      const result = await this.redis.eval(
        script,
        1,
        fullKey,
        this.config.maxRequests,
        windowStart,
        now,
        this.config.windowMs
      ) as [number, number, number];

      const [current, limit, resetTime] = result;
      const allowed = current <= limit;

      const rateLimitResult: RateLimitResult = {
        allowed,
        info: {
          limit,
          current,
          remaining: Math.max(0, limit - current),
          resetTime,
        },
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      };

      this.logRateLimit(key, rateLimitResult);
      return rateLimitResult;

    } catch (error) {
      logger.error('Redis sliding window check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          current: 0,
          remaining: this.config.maxRequests,
          resetTime: now + this.config.windowMs,
        },
      };
    }
  }
}
