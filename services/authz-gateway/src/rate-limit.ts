export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

interface Bucket {
  remaining: number;
  reset: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export class RateLimiter {
  private limit: number;
  private windowMs: number;
  private now: () => number;
  private buckets = new Map<string, Bucket>();

  constructor(options: RateLimitOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  check(key: string): RateLimitStatus {
    const current = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.reset <= current) {
      const fresh: Bucket = {
        remaining: this.limit,
        reset: current + this.windowMs,
      };
      this.buckets.set(key, fresh);
      fresh.remaining -= 1;
      return {
        allowed: true,
        remaining: fresh.remaining,
        reset: fresh.reset,
        limit: this.limit,
      };
    }

    if (bucket.remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        reset: bucket.reset,
        limit: this.limit,
      };
    }

    bucket.remaining -= 1;
    return {
      allowed: true,
      remaining: bucket.remaining,
      reset: bucket.reset,
      limit: this.limit,
    };
  }
}
