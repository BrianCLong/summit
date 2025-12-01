/**
 * Sliding Window Strategy
 *
 * More accurate than fixed window, considers requests in a rolling time period
 */

import { RateLimiter, RateLimitConfig, RateLimitResult } from '../rate-limiter.js';

export class SlidingWindowLimiter extends RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(config: RateLimitConfig) {
    super(config);
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    const fullKey = this.getKey(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request timestamps
    let timestamps = this.requests.get(fullKey) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter(ts => ts > windowStart);

    // Add current timestamp
    timestamps.push(now);

    // Update stored timestamps
    this.requests.set(fullKey, timestamps);

    const allowed = timestamps.length <= this.config.maxRequests;
    const result: RateLimitResult = {
      allowed,
      info: {
        limit: this.config.maxRequests,
        current: timestamps.length,
        remaining: Math.max(0, this.config.maxRequests - timestamps.length),
        resetTime: timestamps[0] + this.config.windowMs,
      },
      retryAfter: allowed ? undefined : Math.ceil((timestamps[0] + this.config.windowMs - now) / 1000),
    };

    this.logRateLimit(key, result);
    return result;
  }

  async resetLimit(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.requests.delete(fullKey);
  }

  // Cleanup old requests
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(ts => ts > now - this.config.windowMs);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}
