/**
 * Advanced Tiered Rate Limiting Middleware
 *
 * Implements:
 * - Distributed Token Bucket Algorithm (Redis-backed)
 * - Multi-tiered limits (Free, Basic, Premium, Enterprise)
 * - Priority Traffic Shaping (Delay for high-priority users instead of reject)
 * - Cost-based limiting (Daily Quota)
 * - Burst allowance
 * - Adaptive Throttling
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import pino from 'pino';

const logger = (pino as any)({ name: 'advanced-rate-limit' });

export enum RateLimitTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  INTERNAL = 'internal',
}

export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TierLimits {
  requestsPerMinute: number; // Used for calculating refill rate
  burstLimit: number; // Bucket capacity
  concurrentRequests: number;
  costLimit: number; // Max cost per day (Quota)
  queuePriority: number; // Higher = more important
}

export interface RateLimitConfig {
  tiers?: {
    [tier: string]: TierLimits;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix?: string;
  };
  costTracking?: boolean;
  adaptiveThrottling?: boolean;
  enableTrafficShaping?: boolean; // If true, delay request instead of 429 for high tiers
}

const DEFAULT_TIER_LIMITS: { [tier in RateLimitTier]: TierLimits } = {
  [RateLimitTier.FREE]: {
    requestsPerMinute: 20,
    burstLimit: 20,
    concurrentRequests: 5,
    costLimit: 100,
    queuePriority: 1,
  },
  [RateLimitTier.BASIC]: {
    requestsPerMinute: 60,
    burstLimit: 60,
    concurrentRequests: 10,
    costLimit: 1000,
    queuePriority: 2,
  },
  [RateLimitTier.PREMIUM]: {
    requestsPerMinute: 300,
    burstLimit: 600, // Allow 2 minutes worth of burst
    concurrentRequests: 50,
    costLimit: 10000,
    queuePriority: 3,
  },
  [RateLimitTier.ENTERPRISE]: {
    requestsPerMinute: 3000,
    burstLimit: 6000,
    concurrentRequests: 200,
    costLimit: 100000,
    queuePriority: 4,
  },
  [RateLimitTier.INTERNAL]: {
    requestsPerMinute: 10000,
    burstLimit: 20000,
    concurrentRequests: 1000,
    costLimit: 1000000,
    queuePriority: 5,
  },
};

// Lua script for Token Bucket algorithm
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local info = redis.call('hmget', key, 'tokens', 'last_refill')
local tokens = tonumber(info[1])
local last_refill = tonumber(info[2])

if tokens == nil then
  tokens = capacity
  last_refill = now
end

-- Calculate refill
local delta = math.max(0, now - last_refill)
local refill = delta * rate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
local remaining = tokens
local retry_after = 0

if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
  remaining = tokens
  -- Update state
  redis.call('hmset', key, 'tokens', tokens, 'last_refill', now)
  redis.call('pexpire', key, ttl)
else
  allowed = 0
  local deficit = cost - tokens
  -- Time to refill enough tokens: deficit / rate
  if rate > 0 then
    retry_after = deficit / rate
  else
    retry_after = -1 -- Infinite if rate is 0
  end
end

return { allowed, remaining, retry_after }
`;

export class AdvancedRateLimiter {
  private redis: Redis;
  private keyPrefix: string;
  private tierLimits: { [tier: string]: TierLimits };
  private costTracking: boolean;
  private adaptiveThrottling: boolean;
  private enableTrafficShaping: boolean;
  private heapThreshold = 0.85; // 85% heap usage triggers throttling

  constructor(config: RateLimitConfig) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });

    this.keyPrefix = config.redis.keyPrefix || 'rl:';
    this.tierLimits = { ...DEFAULT_TIER_LIMITS, ...config.tiers };
    this.costTracking = config.costTracking ?? true;
    this.adaptiveThrottling = config.adaptiveThrottling ?? true;
    this.enableTrafficShaping = config.enableTrafficShaping ?? true;

    // Register Lua script
    this.redis.defineCommand('consumeTokenBucket', {
      numberOfKeys: 1,
      lua: TOKEN_BUCKET_SCRIPT,
    });

    this.redis.on('error', (err: any) => {
      logger.error({ err }, 'Redis connection error');
    });

    if (this.adaptiveThrottling) {
      this.startAdaptiveMonitoring();
    }
  }

  /**
   * Express Middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tier = this.getTierFromRequest(req);
        const userId = this.getUserIdFromRequest(req);
        const priority = this.getPriorityFromRequest(req);
        const cost = (res.locals as any).estimatedCost || 1; // Default cost 1 token

        // Check concurrent limits first
        const concurrentKey = this.getConcurrentKey(userId);
        const concurrentCount = await this.getCurrentConcurrentRequests(userId);
        const limits = this.getLimits(tier);

        if (concurrentCount >= limits.concurrentRequests) {
          res.set('Retry-After', '1');
          res.status(429).json({
            error: 'Concurrent request limit exceeded',
            limit: limits.concurrentRequests,
          });
          return;
        }

        // Check Daily Cost Quota
        if (this.costTracking) {
          const costResult = await this.checkCostQuota(userId, limits.costLimit, cost);
          if (!costResult.allowed) {
            res.set('X-RateLimit-Quota-Remaining', '0');
            const retryAfterSeconds = Math.ceil((costResult.reset - Date.now()) / 1000);
            res.set('Retry-After', retryAfterSeconds.toString());
            res.status(429).json({
              error: 'Daily quota exceeded',
              limit: limits.costLimit,
              resetTime: costResult.reset
            });
            return;
          }
          res.set('X-RateLimit-Quota-Remaining', costResult.remaining.toString());
        }

        // Token Bucket Check (Rate Limit)
        const result = await this.checkTokenBucket(userId, tier, cost);

        // Headers
        res.set({
          'X-RateLimit-Tier': tier,
          'X-RateLimit-Limit': limits.requestsPerMinute.toString(), // Approximated as rate
          'X-RateLimit-Remaining': Math.floor(result.remaining).toString(),
          'X-RateLimit-Reset': (Date.now() + (result.retryAfter || 0)).toString(),
        });

        if (!result.allowed) {
          // Traffic Shaping: If priority is high and wait time is short, wait.
          if (
            this.enableTrafficShaping &&
            (tier === RateLimitTier.PREMIUM || tier === RateLimitTier.ENTERPRISE || tier === RateLimitTier.INTERNAL) &&
            result.retryAfter < 2000 // Wait max 2 seconds
          ) {
            logger.info({ userId, tier, wait: result.retryAfter }, 'Traffic shaping: delaying request');
            await new Promise((resolve) => setTimeout(resolve, result.retryAfter));

            // Re-check after waiting
            const retryResult = await this.checkTokenBucket(userId, tier, cost);
            if (!retryResult.allowed) {
              res.status(429).json({
                error: 'Rate limit exceeded after wait',
                retryAfter: Math.ceil(retryResult.retryAfter / 1000),
              });
              return;
            }
            // Proceed
          } else {
            res.status(429).json({
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil(result.retryAfter / 1000),
            });
            return;
          }
        }

        // Track concurrency (increment now, decrement on finish)
        await this.redis.incr(concurrentKey);
        await this.redis.expire(concurrentKey, 30); // Safety TTL

        res.on('finish', async () => {
          await this.redis.decr(concurrentKey);
          // Actual cost update happens here
          if (this.costTracking) {
            const actualCost = (res.locals as any).actualCost || cost;
            await this.recordRequestCost(userId, actualCost);
          }
        });

        next();
      } catch (error: any) {
        logger.error({ error }, 'Rate limiting error, failing open');
        next();
      }
    };
  }

  private async checkTokenBucket(
    userId: string,
    tier: RateLimitTier,
    cost: number
  ): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
    const limits = this.getLimits(tier);
    const key = `${this.keyPrefix}bucket:${userId}`;
    const now = Date.now();

    // Refill rate: tokens per ms
    const rate = limits.requestsPerMinute / 60000;
    const capacity = limits.burstLimit;
    const ttl = 86400000; // 24h

    // @ts-ignore - consumeTokenBucket is defined via defineCommand
    const result = await this.redis.consumeTokenBucket(
      key,
      rate,
      capacity,
      cost,
      now,
      ttl
    );

    // Lua returns [allowed, remaining, retryAfter]
    return {
      allowed: result[0] === 1,
      remaining: Number(result[1]),
      retryAfter: Number(result[2]),
    };
  }

  private async checkCostQuota(
    userId: string,
    limit: number,
    estimatedCost: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const key = `${this.keyPrefix}cost:${userId}:daily`;
    const currentCostStr = await this.redis.get(key);
    const currentCost = currentCostStr ? parseFloat(currentCostStr) : 0;

    const allowed = (currentCost + estimatedCost) <= limit;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed,
      remaining: Math.max(0, limit - currentCost),
      reset: tomorrow.getTime()
    };
  }

  private getLimits(tier: RateLimitTier): TierLimits {
    return this.tierLimits[tier] || this.tierLimits[RateLimitTier.FREE];
  }

  private getConcurrentKey(userId: string): string {
    return `${this.keyPrefix}concurrent:${userId}`;
  }

  private async getCurrentConcurrentRequests(userId: string): Promise<number> {
    const key = this.getConcurrentKey(userId);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  private async recordRequestCost(userId: string, cost: number): Promise<void> {
    const key = `${this.keyPrefix}cost:${userId}:daily`;
    await this.redis.incrbyfloat(key, cost);
    await this.redis.expire(key, 86400);
  }

  private getTierFromRequest(req: Request): RateLimitTier {
    // 1. Check explicit header (internal use or debug)
    const headerTier = req.headers['x-rate-limit-tier'] as RateLimitTier;
    if (headerTier && Object.values(RateLimitTier).includes(headerTier)) {
      return headerTier;
    }
    // 2. Check authenticated user
    const user = (req as any).user;
    if (user?.tier) {
      return user.tier as RateLimitTier;
    }
    // 3. Fallback to IP-based identification if needed, or default
    return RateLimitTier.FREE;
  }

  private getUserIdFromRequest(req: Request): string {
    const user = (req as any).user;
    if (user?.id) return `user:${user.id}`;
    if (user?.sub) return `user:${user.sub}`;
    return `ip:${req.ip}`;
  }

  private getPriorityFromRequest(req: Request): RequestPriority {
    const p = req.headers['x-request-priority'] as RequestPriority;
    if (p && Object.values(RequestPriority).includes(p)) return p;
    return RequestPriority.NORMAL;
  }

  private startAdaptiveMonitoring() {
    setInterval(() => {
      const mem = process.memoryUsage();
      const heapUsed = mem.heapUsed / mem.heapTotal;
      if (heapUsed > this.heapThreshold) {
        logger.warn({ heapUsed }, 'High memory pressure, potential shedding needed');
        // Could decrement global capacity multiplier here
      }
    }, 30000);
  }

  /**
   * Public API for Dashboard
   */
  async getStatus(userId: string) {
    // This would need to infer tier or accept it
    // For simplicity, we just return the raw bucket state
    const key = `${this.keyPrefix}bucket:${userId}`;
    const [tokens, lastRefill] = await this.redis.hmget(key, 'tokens', 'last_refill');
    const costKey = `${this.keyPrefix}cost:${userId}:daily`;
    const cost = await this.redis.get(costKey);

    return {
      userId,
      tokens: tokens ? parseFloat(tokens) : null,
      lastRefill: lastRefill ? parseInt(lastRefill) : null,
      dailyCost: cost ? parseFloat(cost) : 0
    };
  }
}

export const advancedRateLimiter = new AdvancedRateLimiter({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
});
