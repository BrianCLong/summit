import { getRedisClient } from '../config/database.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import pino from 'pino';

const logger = pino();

export interface RateLimitResult {
  allowed: boolean;
  total: number;
  remaining: number;
  reset: number; // Timestamp in ms
}

export class RateLimiter {
  private metrics: PrometheusMetrics;
  private readonly namespace = 'rate_limit';

  constructor() {
    this.metrics = new PrometheusMetrics('rate_limiter');
    this.metrics.createCounter('hits_total', 'Total rate limit checks', ['status']);
    this.metrics.createCounter('blocked_total', 'Total blocked requests', ['key_prefix']);
  }

  /**
   * Check if a key has exceeded the rate limit (consumes 1 point).
   */
  async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    return this.consume(key, 1, limit, windowMs);
  }

  /**
   * Consume points from the rate limit bucket.
   * Uses a sliding window counter (fixed window with Redis expiration).
   *
   * @param key Unique key for the limit
   * @param points Number of points to consume
   * @param limit Max points allowed in window
   * @param windowMs Window size in milliseconds
   * @returns RateLimitResult
   */
  async consume(key: string, points: number, limit: number, windowMs: number): Promise<RateLimitResult> {
    const redisKey = `${this.namespace}:${key}`;
    const now = Date.now();
    const redisClient = getRedisClient();

    if (!redisClient) {
      // Fail open if Redis is not available
      logger.warn('Redis client not available for rate limiting, allowing request');
      return {
        allowed: true,
        total: limit,
        remaining: limit,
        reset: now + windowMs,
      };
    }

    try {
      // Lua script to increment by points and set expiry atomically
      // Returns [current_count, ttl_ms]
      const script = `
        local current = redis.call("INCRBY", KEYS[1], ARGV[1])
        local ttl = redis.call("PTTL", KEYS[1])
        if tonumber(current) == tonumber(ARGV[1]) then
          redis.call("PEXPIRE", KEYS[1], ARGV[2])
          ttl = ARGV[2]
        end
        return {current, ttl}
      `;

      const result = await redisClient.eval(script, 1, redisKey, points, windowMs) as [number, number];
      const current = result[0];
      const ttl = result[1]; // TTL in ms

      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      const reset = now + (ttl > 0 ? ttl : windowMs);

      this.metrics.incrementCounter('hits_total', { status: allowed ? 'allowed' : 'blocked' });

      if (!allowed) {
          // Identify prefix for metrics (e.g. "ip" or "user")
          const prefix = key.split(':')[0] || 'unknown';
          this.metrics.incrementCounter('blocked_total', { key_prefix: prefix });
      }

      return {
        allowed,
        total: limit,
        remaining,
        reset,
      };

    } catch (error) {
      logger.error({ err: error }, 'Rate limiting error');
      // Fail open
      return {
        allowed: true,
        total: limit,
        remaining: limit,
        reset: now + windowMs,
      };
    }
  }
}

export const rateLimiter = new RateLimiter();
