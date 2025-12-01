/**
 * Redis-based Rate Limit Store
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import pino from 'pino';
import type {
  IRateLimitStore,
  RateLimitState,
  TokenBucketState,
} from '../types.js';

const logger = pino();

export class RedisRateLimitStore implements IRateLimitStore {
  private client: Redis;
  private keyPrefix: string;

  constructor(redisClient: Redis, keyPrefix = 'ratelimit:') {
    this.client = redisClient;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Sliding window counter implementation using Redis
   */
  async increment(key: string, windowMs: number): Promise<RateLimitState> {
    const prefixedKey = this.keyPrefix + key;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Lua script for atomic operations
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local window_ms = tonumber(ARGV[3])
        local ttl_ms = tonumber(ARGV[4])

        -- Remove old entries outside the window
        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

        -- Add current request
        redis.call('ZADD', key, now, now)

        -- Set expiration
        redis.call('PEXPIRE', key, ttl_ms)

        -- Count requests in current window
        local count = redis.call('ZCARD', key)

        -- Get oldest entry for reset calculation
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset_at = now + window_ms
        if #oldest > 0 then
          reset_at = tonumber(oldest[2]) + window_ms
        end

        return {count, reset_at}
      `;

      const ttlMs = windowMs + 1000; // Add buffer for cleanup
      const result = await this.client.eval(
        script,
        1,
        prefixedKey,
        now.toString(),
        windowStart.toString(),
        windowMs.toString(),
        ttlMs.toString(),
      );

      const [count, resetAt] = result as [number, number];

      // For sliding window, we don't have a fixed max here
      // That's determined by the policy
      return {
        key,
        consumed: count,
        limit: 0, // Will be filled in by the limiter
        remaining: 0, // Will be calculated by the limiter
        resetAt: Math.floor(resetAt / 1000),
        retryAfter: Math.ceil((resetAt - now) / 1000),
        isExceeded: false, // Will be determined by the limiter
      };
    } catch (error) {
      logger.error({
        message: 'Redis rate limit increment failed',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current rate limit state
   */
  async get(key: string): Promise<RateLimitState | null> {
    const prefixedKey = this.keyPrefix + key;

    try {
      const count = await this.client.zcard(prefixedKey);
      const ttl = await this.client.pttl(prefixedKey);

      if (ttl === -2) {
        // Key doesn't exist
        return null;
      }

      const now = Date.now();
      const resetAt = Math.floor((now + ttl) / 1000);

      return {
        key,
        consumed: count,
        limit: 0,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil(ttl / 1000),
        isExceeded: false,
      };
    } catch (error) {
      logger.error({
        message: 'Redis rate limit get failed',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const prefixedKey = this.keyPrefix + key;

    try {
      await this.client.del(prefixedKey);
    } catch (error) {
      logger.error({
        message: 'Redis rate limit reset failed',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get token bucket state
   */
  async getTokenBucket(key: string): Promise<TokenBucketState | null> {
    const prefixedKey = this.keyPrefix + 'tb:' + key;

    try {
      const data = await this.client.hgetall(prefixedKey);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        tokens: parseFloat(data.tokens) || 0,
        capacity: parseFloat(data.capacity) || 0,
        lastRefill: parseInt(data.lastRefill) || Date.now(),
        refillRate: parseFloat(data.refillRate) || 0,
      };
    } catch (error) {
      logger.error({
        message: 'Redis token bucket get failed',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Consume tokens from bucket using token bucket algorithm
   */
  async consumeTokens(
    key: string,
    tokensToConsume: number,
    capacity: number,
    refillRate: number,
  ): Promise<TokenBucketState> {
    const prefixedKey = this.keyPrefix + 'tb:' + key;
    const now = Date.now();

    try {
      // Lua script for atomic token bucket operations
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local tokens_to_consume = tonumber(ARGV[2])
        local capacity = tonumber(ARGV[3])
        local refill_rate = tonumber(ARGV[4])
        local ttl_seconds = tonumber(ARGV[5])

        -- Get current state
        local tokens = tonumber(redis.call('HGET', key, 'tokens'))
        local last_refill = tonumber(redis.call('HGET', key, 'lastRefill'))

        -- Initialize if doesn't exist
        if not tokens then
          tokens = capacity
          last_refill = now
        end

        -- Calculate refill
        local time_passed = (now - last_refill) / 1000  -- Convert to seconds
        local tokens_to_add = time_passed * refill_rate
        tokens = math.min(capacity, tokens + tokens_to_add)

        -- Try to consume
        local success = false
        if tokens >= tokens_to_consume then
          tokens = tokens - tokens_to_consume
          success = true
        end

        -- Update state
        redis.call('HSET', key, 'tokens', tostring(tokens))
        redis.call('HSET', key, 'lastRefill', tostring(now))
        redis.call('HSET', key, 'capacity', tostring(capacity))
        redis.call('HSET', key, 'refillRate', tostring(refill_rate))
        redis.call('EXPIRE', key, ttl_seconds)

        return {tokens, now, success}
      `;

      // TTL is twice the time to refill bucket
      const ttlSeconds = Math.ceil((capacity / refillRate) * 2);

      const result = await this.client.eval(
        script,
        1,
        prefixedKey,
        now.toString(),
        tokensToConsume.toString(),
        capacity.toString(),
        refillRate.toString(),
        ttlSeconds.toString(),
      );

      const [tokens, lastRefill] = result as [number, number, number];

      return {
        tokens,
        capacity,
        lastRefill,
        refillRate,
      };
    } catch (error) {
      logger.error({
        message: 'Redis token bucket consume failed',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error({
        message: 'Redis health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
