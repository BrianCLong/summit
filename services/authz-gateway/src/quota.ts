export interface QuotaOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

interface QuotaBucket {
  used: number;
  reset: number;
}

export interface QuotaStatus {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export class QuotaManager {
  private limit: number;
  private windowMs: number;
  private now: () => number;
  private buckets = new Map<string, QuotaBucket>();

  constructor(options: QuotaOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  consume(key: string): QuotaStatus {
    const current = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.reset <= current) {
      const fresh: QuotaBucket = { used: 0, reset: current + this.windowMs };
      this.buckets.set(key, fresh);
      fresh.used += 1;
      return {
        allowed: true,
        remaining: this.limit - fresh.used,
        reset: fresh.reset,
        limit: this.limit,
      };
    }

    if (bucket.used >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        reset: bucket.reset,
        limit: this.limit,
      };
    }

    bucket.used += 1;
    return {
      allowed: true,
      remaining: this.limit - bucket.used,
      reset: bucket.reset,
      limit: this.limit,
    };
  }
}
