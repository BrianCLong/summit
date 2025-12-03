/**
 * Fixed Window Strategy
 *
 * Counts requests within fixed time windows
 */

import { RateLimiter, RateLimitConfig, RateLimitResult } from '../rate-limiter.js';

export class FixedWindowLimiter extends RateLimiter {
  private windows = new Map<string, WindowData>();

  constructor(config: RateLimitConfig) {
    super(config);
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    const fullKey = this.getKey(key);
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowEnd = windowStart + this.config.windowMs;

    let window = this.windows.get(fullKey);

    // Create new window if needed
    if (!window || window.windowStart !== windowStart) {
      window = {
        windowStart,
        windowEnd,
        count: 0,
      };
      this.windows.set(fullKey, window);
    }

    // Increment counter
    window.count++;

    const allowed = window.count <= this.config.maxRequests;
    const result: RateLimitResult = {
      allowed,
      info: {
        limit: this.config.maxRequests,
        current: window.count,
        remaining: Math.max(0, this.config.maxRequests - window.count),
        resetTime: windowEnd,
      },
      retryAfter: allowed ? undefined : Math.ceil((windowEnd - now) / 1000),
    };

    this.logRateLimit(key, result);
    return result;
  }

  async resetLimit(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.windows.delete(fullKey);
  }

  // Cleanup expired windows
  cleanup(): void {
    const now = Date.now();
    for (const [key, window] of this.windows.entries()) {
      if (now > window.windowEnd) {
        this.windows.delete(key);
      }
    }
  }
}

interface WindowData {
  windowStart: number;
  windowEnd: number;
  count: number;
}
