/**
 * Token Bucket Strategy
 *
 * Allows burst traffic while maintaining average rate
 */

import { RateLimiter, RateLimitConfig, RateLimitResult } from '../rate-limiter.js';

export interface TokenBucketConfig extends RateLimitConfig {
  bucketSize: number;
  refillRate: number; // tokens per second
}

export class TokenBucketLimiter extends RateLimiter {
  private buckets = new Map<string, BucketData>();
  private bucketConfig: TokenBucketConfig;

  constructor(config: TokenBucketConfig) {
    super(config);
    this.bucketConfig = config;
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    const fullKey = this.getKey(key);
    const now = Date.now();

    let bucket = this.buckets.get(fullKey);

    if (!bucket) {
      bucket = {
        tokens: this.bucketConfig.bucketSize,
        lastRefill: now,
      };
      this.buckets.set(fullKey, bucket);
    }

    // Refill tokens based on time elapsed
    const timeSinceRefill = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timeSinceRefill * this.bucketConfig.refillRate;
    bucket.tokens = Math.min(this.bucketConfig.bucketSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to consume a token
    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    const resetTime = now + ((1 - bucket.tokens % 1) / this.bucketConfig.refillRate) * 1000;

    const result: RateLimitResult = {
      allowed,
      info: {
        limit: this.bucketConfig.bucketSize,
        current: this.bucketConfig.bucketSize - Math.floor(bucket.tokens),
        remaining: Math.floor(bucket.tokens),
        resetTime,
      },
      retryAfter: allowed ? undefined : Math.ceil((1 / this.bucketConfig.refillRate)),
    };

    this.logRateLimit(key, result);
    return result;
  }

  async resetLimit(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.buckets.delete(fullKey);
  }
}

interface BucketData {
  tokens: number;
  lastRefill: number;
}
