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
   * Check if a key has exceeded the rate limit using Token Bucket algorithm.
   *
   * @param key Unique key for the limit
   * @param limit Max tokens (capacity)
   * @param windowMs Time window for the limit in ms (used to calculate rate)
   * @param cost Cost of the operation (default 1)
   */
  async checkLimit(key: string, limit: number, windowMs: number, cost: number = 1): Promise<RateLimitResult> {
    const redisClient = getRedisClient();
    const now = Date.now();

    // Calculate rate: tokens per second
    const rate = limit / (windowMs / 1000);

    if (!redisClient) {
      // Fail open if Redis is not available
      logger.warn('Redis client not available for rate limiting, allowing request');
      return {
        allowed: true,
        total: limit,
        remaining: limit,
        reset: now,
      };
    }

    const tokensKey = `${this.namespace}:${key}:tokens`;
    const timestampKey = `${this.namespace}:${key}:ts`;

    try {
      // Lua script for Token Bucket
      // KEYS[1]: tokens key
      // KEYS[2]: timestamp key
      // ARGV[1]: refill rate (tokens/sec)
      // ARGV[2]: capacity (max tokens)
      // ARGV[3]: current timestamp (ms)
      // ARGV[4]: requested tokens (cost)
      const script = `
        local tokens_key = KEYS[1]
        local ts_key = KEYS[2]
        local rate = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local requested = tonumber(ARGV[4])

        local fill_time = capacity / rate
        local ttl = math.ceil(fill_time * 2)

        local last_tokens = tonumber(redis.call("get", tokens_key))
        if last_tokens == nil then
          last_tokens = capacity
        end

        local last_refill = tonumber(redis.call("get", ts_key))
        if last_refill == nil then
          last_refill = 0
        end

        local delta = math.max(0, now - last_refill) / 1000
        local filled_tokens = math.min(capacity, last_tokens + (delta * rate))

        local allowed = 0
        local new_tokens = filled_tokens

        if filled_tokens >= requested then
          allowed = 1
          new_tokens = filled_tokens - requested
          redis.call("setex", tokens_key, ttl, new_tokens)
          redis.call("setex", ts_key, ttl, now)
        end

        return {allowed, new_tokens}
      `;

      const result = await redisClient.eval(script, 2, tokensKey, timestampKey, rate, limit, now, cost) as [number, number];
      const isAllowed = result[0] === 1;
      const currentTokens = result[1];

      this.metrics.incrementCounter('hits_total', { status: isAllowed ? 'allowed' : 'blocked' });

      if (!isAllowed) {
          const prefix = key.split(':')[0] || 'unknown';
          this.metrics.incrementCounter('blocked_total', { key_prefix: prefix });
      }

      // Calculate pseudo-reset time (time until full) - optional estimation
      const timeToFull = ((limit - currentTokens) / rate) * 1000;

      return {
        allowed: isAllowed,
        total: limit,
        remaining: Math.floor(currentTokens),
        reset: now + timeToFull,
      };

    } catch (error) {
      logger.error({ err: error }, 'Rate limiting error');
      // Fail open
      return {
        allowed: true,
        total: limit,
        remaining: limit,
        reset: now,
      };
    }
  }
}

export const rateLimiter = new RateLimiter();
