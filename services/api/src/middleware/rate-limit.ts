import { RateLimiterRedis } from 'rate-limiter-flexible';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

interface TierConfig {
  requestsPerMinute: number;
}

export class AdaptiveRateLimiter {
  private limiters: Map<string, RateLimiterRedis> = new Map();

  constructor(private redis: any) {} // Redis client

  async checkLimit(
    key: string,
    tier: 'free' | 'pro' | 'enterprise'
  ): Promise<RateLimitResult> {
    const limiter = this.getLimiterForTier(tier);

    try {
      await limiter.consume(key);
      return { allowed: true };
    } catch (err: any) {
      if (err instanceof Error && 'msBeforeNext' in err) {
         return {
          allowed: false,
          retryAfter: (err as any).msBeforeNext / 1000,
        };
      }
      // If it's a RateLimiterRes object (which has msBeforeNext), it's thrown as error
      if (err && typeof err.msBeforeNext === 'number') {
        return {
          allowed: false,
          retryAfter: err.msBeforeNext / 1000,
        };
      }
      throw err;
    }
  }

  private getTierConfig(tier: string): TierConfig {
    switch (tier) {
      case 'enterprise': return { requestsPerMinute: 1000 };
      case 'pro': return { requestsPerMinute: 100 };
      default: return { requestsPerMinute: 10 };
    }
  }

  private getLimiterForTier(tier: string): RateLimiterRedis {
    if (!this.limiters.has(tier)) {
      const config = this.getTierConfig(tier);
      this.limiters.set(tier, new RateLimiterRedis({
        storeClient: this.redis,
        points: config.requestsPerMinute,
        duration: 60,
      }));
    }
    return this.limiters.get(tier)!;
  }
}
