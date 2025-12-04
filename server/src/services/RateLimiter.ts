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
   * @param key Unique key for the limit (e.g., user ID or IP)
   * @param limit Max tokens (capacity)
   * @param windowMs Time window in milliseconds for full refill
   * @returns RateLimitResult
   */
  async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const redisKey = `${this.namespace}:${key}`;
    const now = Date.now();
    const redisClient = getRedisClient();

    // Calculate refill rate: tokens per millisecond
    // rate = limit / windowMs
    // but to avoid floats in Redis, we can just use the logic in Lua:
    // new_tokens = (now - last_refill) * (limit / windowMs)
    // if new_tokens > limit, new_tokens = limit

    if (!redisClient) {
      logger.warn('Redis client not available for rate limiting, allowing request');
      return {
        allowed: true,
        total: limit,
        remaining: limit,
        reset: now,
      };
    }

    try {
      // Lua script for Token Bucket
      // KEYS[1]: bucket key (hash)
      // ARGV[1]: capacity (limit)
      // ARGV[2]: refill rate (tokens per ms)
      // ARGV[3]: now (timestamp ms)
      // ARGV[4]: windowMs (for expiry)
      // ARGV[5]: cost (default 1)
      const script = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local ttl = tonumber(ARGV[4])
        local cost = tonumber(ARGV[5])

        -- Get current state
        local bucket = redis.call("HMGET", key, "tokens", "last_refill")
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])

        if not tokens then
          tokens = capacity
          last_refill = now
        end

        -- Refill tokens
        local delta_ms = math.max(0, now - last_refill)
        local filled_tokens = delta_ms * rate
        tokens = math.min(capacity, tokens + filled_tokens)

        -- Check if allowed
        local allowed = 0
        local remaining = tokens
        local reset_ms = 0 -- Time until next token? Or full refill?

        if tokens >= cost then
          tokens = tokens - cost
          allowed = 1
          last_refill = now -- Update last refill time only if we consumed?
          -- Actually standard token bucket updates timestamp on every check or lazy fill.
          -- We updated tokens based on time passed, so we must update last_refill to now.
        else
          -- Calculate when we will have enough tokens
          -- needed = cost - tokens
          -- time = needed / rate
          reset_ms = (cost - tokens) / rate
        end

        -- Save state
        redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
        redis.call("PEXPIRE", key, ttl) -- Keep key alive for window duration

        return {allowed, tokens, reset_ms}
      `;

      const rate = limit / windowMs;
      // Use 1 token cost
      const cost = 1;

      const result = await redisClient.eval(script, 1, redisKey, limit, rate, now, windowMs, cost) as [number, number, number];

      const isAllowed = result[0] === 1;
      const currentTokens = result[1];
      const waitMs = result[2];

      const remaining = Math.floor(currentTokens);
      // "reset" is usually when the limit resets. In token bucket, it's continuous.
      // We can interpret reset as "time until full capacity" or "time until next token".
      // Let's use "time until full capacity" which is (limit - tokens) / rate
      const timeToFull = (limit - currentTokens) / rate;
      const reset = now + timeToFull;

      this.metrics.incrementCounter('hits_total', { status: isAllowed ? 'allowed' : 'blocked' });

      if (!isAllowed) {
          const prefix = key.split(':')[0] || 'unknown';
          this.metrics.incrementCounter('blocked_total', { key_prefix: prefix });
      }

      return {
        allowed: isAllowed,
        total: limit,
        remaining,
        reset: Math.ceil(reset),
      };

    } catch (error) {
      logger.error({ err: error }, 'Rate limiting error');
      return {
        allowed: true, // Fail open
        total: limit,
        remaining: limit,
        reset: now,
      };
    }
  }
}

export const rateLimiter = new RateLimiter();
