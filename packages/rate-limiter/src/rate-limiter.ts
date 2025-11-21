/**
 * Core Rate Limiter
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import pino from 'pino';
import { RedisRateLimitStore } from './store/redis-store.js';
import { SlidingWindowLimiter } from './algorithms/sliding-window.js';
import { TokenBucketLimiter } from './algorithms/token-bucket.js';
import { DEFAULT_CONFIG, getPolicyForEndpoint } from './config.js';
import type {
  RateLimiterOptions,
  RateLimitState,
  RateLimitPolicy,
  UserTier,
  RateLimitConfig,
} from './types.js';

const logger = pino();

export class RateLimiter {
  private store: RedisRateLimitStore;
  private slidingWindow: SlidingWindowLimiter;
  private tokenBucket: TokenBucketLimiter;
  private config: RateLimitConfig;
  private keyPrefix: string;

  constructor(
    redisClient: Redis,
    config: Partial<RateLimitConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyPrefix = this.config.global.keyPrefix;
    this.store = new RedisRateLimitStore(redisClient, this.keyPrefix);
    this.slidingWindow = new SlidingWindowLimiter(this.store);
    this.tokenBucket = new TokenBucketLimiter(this.store);
  }

  /**
   * Check if request should be rate limited
   */
  async check(
    identifier: string,
    endpoint: string,
    tier?: UserTier,
  ): Promise<RateLimitState> {
    if (!this.config.global.enabled) {
      // Rate limiting disabled, allow all requests
      return {
        key: identifier,
        consumed: 0,
        limit: Infinity,
        remaining: Infinity,
        resetAt: 0,
        retryAfter: 0,
        isExceeded: false,
      };
    }

    try {
      // Get policy for this endpoint and tier
      const policy = getPolicyForEndpoint(endpoint, tier, this.config);

      if (!policy.enabled) {
        return {
          key: identifier,
          consumed: 0,
          limit: Infinity,
          remaining: Infinity,
          resetAt: 0,
          retryAfter: 0,
          isExceeded: false,
        };
      }

      // Generate rate limit key
      const key = this.generateKey(identifier, endpoint, tier);

      // Apply rate limiting based on algorithm
      let state: RateLimitState;

      switch (policy.algorithm) {
        case 'sliding-window':
          state = await this.slidingWindow.consume(
            key,
            policy.max,
            policy.windowMs,
          );
          break;

        case 'token-bucket':
          state = await this.tokenBucket.consume(
            key,
            policy.capacity || policy.max,
            policy.refillRate || policy.max / (policy.windowMs / 1000),
          );
          break;

        case 'fixed-window':
          // Fixed window is similar to sliding window but with fixed reset times
          state = await this.slidingWindow.consume(
            key,
            policy.max,
            policy.windowMs,
          );
          break;

        default:
          throw new Error(`Unknown algorithm: ${policy.algorithm}`);
      }

      // Log violation if threshold exceeded
      if (state.isExceeded) {
        logger.warn({
          message: 'Rate limit exceeded',
          identifier,
          endpoint,
          tier,
          consumed: state.consumed,
          limit: state.limit,
        });
      }

      return state;
    } catch (error) {
      logger.error({
        message: 'Rate limit check failed',
        identifier,
        endpoint,
        tier,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open - allow request if rate limiting fails
      return {
        key: identifier,
        consumed: 0,
        limit: Infinity,
        remaining: Infinity,
        resetAt: 0,
        retryAfter: 0,
        isExceeded: false,
      };
    }
  }

  /**
   * Peek at current state without consuming
   */
  async peek(
    identifier: string,
    endpoint: string,
    tier?: UserTier,
  ): Promise<RateLimitState | null> {
    const policy = getPolicyForEndpoint(endpoint, tier, this.config);
    const key = this.generateKey(identifier, endpoint, tier);

    switch (policy.algorithm) {
      case 'sliding-window':
      case 'fixed-window':
        return this.slidingWindow.peek(key, policy.max);

      case 'token-bucket':
        return this.tokenBucket.peek(
          key,
          policy.capacity || policy.max,
          policy.refillRate || policy.max / (policy.windowMs / 1000),
        );

      default:
        return null;
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string, endpoint: string, tier?: UserTier): Promise<void> {
    const key = this.generateKey(identifier, endpoint, tier);
    const policy = getPolicyForEndpoint(endpoint, tier, this.config);

    switch (policy.algorithm) {
      case 'sliding-window':
      case 'fixed-window':
        await this.slidingWindow.reset(key);
        break;

      case 'token-bucket':
        await this.tokenBucket.reset(key);
        break;
    }
  }

  /**
   * Generate unique key for rate limiting
   */
  private generateKey(identifier: string, endpoint: string, tier?: UserTier): string {
    const parts = [identifier, endpoint];
    if (tier) {
      parts.push(tier);
    }
    return parts.join(':');
  }

  /**
   * Get policy for endpoint and tier
   */
  getPolicy(endpoint: string, tier?: UserTier): RateLimitPolicy {
    return getPolicyForEndpoint(endpoint, tier, this.config);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.store.healthCheck();
  }
}

/**
 * Create rate limiter instance
 */
export function createRateLimiter(
  redisClient: Redis,
  config?: Partial<RateLimitConfig>,
): RateLimiter {
  return new RateLimiter(redisClient, config);
}
