/**
 * Leaky Bucket Strategy
 *
 * Processes requests at a constant rate, smoothing bursts
 */

import { RateLimiter, RateLimitConfig, RateLimitResult } from '../rate-limiter.js';

export interface LeakyBucketConfig extends RateLimitConfig {
  capacity: number;
  leakRate: number; // requests per second
}

export class LeakyBucketLimiter extends RateLimiter {
  private buckets = new Map<string, LeakyBucketData>();
  private bucketConfig: LeakyBucketConfig;

  constructor(config: LeakyBucketConfig) {
    super(config);
    this.bucketConfig = config;
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    const fullKey = this.getKey(key);
    const now = Date.now();

    let bucket = this.buckets.get(fullKey);

    if (!bucket) {
      bucket = {
        water: 0,
        lastLeak: now,
      };
      this.buckets.set(fullKey, bucket);
    }

    // Leak water based on time elapsed
    const timeSinceLeak = (now - bucket.lastLeak) / 1000;
    const waterToLeak = timeSinceLeak * this.bucketConfig.leakRate;
    bucket.water = Math.max(0, bucket.water - waterToLeak);
    bucket.lastLeak = now;

    // Try to add water
    const allowed = bucket.water < this.bucketConfig.capacity;

    if (allowed) {
      bucket.water += 1;
    }

    const resetTime = now + ((bucket.water / this.bucketConfig.leakRate) * 1000);

    const result: RateLimitResult = {
      allowed,
      info: {
        limit: this.bucketConfig.capacity,
        current: Math.ceil(bucket.water),
        remaining: Math.max(0, Math.floor(this.bucketConfig.capacity - bucket.water)),
        resetTime,
      },
      retryAfter: allowed ? undefined : Math.ceil((bucket.water - this.bucketConfig.capacity + 1) / this.bucketConfig.leakRate),
    };

    this.logRateLimit(key, result);
    return result;
  }

  async resetLimit(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.buckets.delete(fullKey);
  }
}

interface LeakyBucketData {
  water: number;
  lastLeak: number;
}
