/**
 * Tiered Rate Limiting and Request Throttling Middleware
 *
 * Implements sophisticated rate limiting with multiple tiers, priorities,
 * and cost-based throttling to prevent resource abuse and optimize costs.
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import pino from 'pino';
import { costGuard } from '../services/cost-guard';

const logger = pino({ name: 'tiered-rate-limit' });

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
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
  burstLimit: number;
  costLimit: number; // Max cost per day
  queuePriority: number; // Higher = more important
}

export interface RateLimitConfig {
  tiers: {
    [tier: string]: TierLimits;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix?: string;
  };
  costTracking: boolean;
  adaptiveThrottling: boolean;
  queueing: boolean;
}

const DEFAULT_TIER_LIMITS: { [tier in RateLimitTier]: TierLimits } = {
  [RateLimitTier.FREE]: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    concurrentRequests: 2,
    burstLimit: 20,
    costLimit: 1.0,
    queuePriority: 1,
  },
  [RateLimitTier.BASIC]: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    concurrentRequests: 10,
    burstLimit: 120,
    costLimit: 10.0,
    queuePriority: 2,
  },
  [RateLimitTier.PREMIUM]: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    concurrentRequests: 50,
    burstLimit: 600,
    costLimit: 100.0,
    queuePriority: 3,
  },
  [RateLimitTier.ENTERPRISE]: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000,
    concurrentRequests: 200,
    burstLimit: 2000,
    costLimit: 1000.0,
    queuePriority: 4,
  },
  [RateLimitTier.INTERNAL]: {
    requestsPerMinute: 10000,
    requestsPerHour: 500000,
    requestsPerDay: 5000000,
    concurrentRequests: 1000,
    burstLimit: 20000,
    costLimit: 10000.0,
    queuePriority: 5,
  },
};

export class TieredRateLimiter {
  private redis: Redis;
  private keyPrefix: string;
  private tierLimits: { [tier: string]: TierLimits };
  private costTracking: boolean;
  private adaptiveThrottling: boolean;
  private queueing: boolean;
  private requestQueue: Map<string, Array<() => void>> = new Map();

  constructor(config: RateLimitConfig) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.keyPrefix = config.redis.keyPrefix || 'rl:';
    this.tierLimits = { ...DEFAULT_TIER_LIMITS, ...config.tiers };
    this.costTracking = config.costTracking ?? true;
    this.adaptiveThrottling = config.adaptiveThrottling ?? true;
    this.queueing = config.queueing ?? true;

    this.redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    this.redis.on('connect', () => {
      logger.info('Rate limiter Redis connected');
    });

    if (this.adaptiveThrottling) {
      this.startAdaptiveMonitoring();
    }
  }

  /**
   * Create Express middleware for rate limiting
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tier = this.getTierFromRequest(req);
        const userId = this.getUserIdFromRequest(req);
        const priority = this.getPriorityFromRequest(req);

        const result = await this.checkRateLimit(userId, tier, priority);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Tier': tier,
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        });

        if (!result.allowed) {
          res.status(429).json({
            error: 'Rate limit exceeded',
            tier,
            limit: result.limit,
            remaining: 0,
            resetTime: result.resetTime,
            retryAfter: result.retryAfter,
            message: result.reason,
          });
          return;
        }

        // Track request start for concurrent limit
        const concurrentKey = this.getConcurrentKey(userId);
        await this.redis.incr(concurrentKey);

        // Cleanup on response finish
        res.on('finish', async () => {
          await this.redis.decr(concurrentKey);

          // Record cost if tracking enabled
          if (this.costTracking && res.locals.requestCost) {
            await this.recordRequestCost(userId, res.locals.requestCost);
          }
        });

        next();
      } catch (error) {
        logger.error({ error }, 'Rate limiting error');
        // Fail open - allow request if rate limiting fails
        next();
      }
    };
  }

  /**
   * Check if request is within rate limits
   */
  async checkRateLimit(
    userId: string,
    tier: RateLimitTier,
    priority: RequestPriority = RequestPriority.NORMAL,
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    reason?: string;
  }> {
    const limits = this.tierLimits[tier];

    if (!limits) {
      logger.warn({ tier }, 'Unknown rate limit tier, using FREE tier');
      return this.checkRateLimit(userId, RateLimitTier.FREE, priority);
    }

    // Check concurrent requests first (fastest check)
    const concurrent = await this.getCurrentConcurrentRequests(userId);
    if (concurrent >= limits.concurrentRequests) {
      return {
        allowed: false,
        limit: limits.concurrentRequests,
        remaining: 0,
        resetTime: Date.now() + 1000,
        retryAfter: 1,
        reason: 'Concurrent request limit exceeded',
      };
    }

    // Check per-minute rate limit (sliding window)
    const minuteResult = await this.checkSlidingWindow(
      userId,
      'minute',
      limits.requestsPerMinute,
      60,
    );

    if (!minuteResult.allowed) {
      return {
        ...minuteResult,
        reason: 'Per-minute rate limit exceeded',
      };
    }

    // Check per-hour rate limit
    const hourResult = await this.checkSlidingWindow(
      userId,
      'hour',
      limits.requestsPerHour,
      3600,
    );

    if (!hourResult.allowed) {
      return {
        ...hourResult,
        reason: 'Per-hour rate limit exceeded',
      };
    }

    // Check per-day rate limit
    const dayResult = await this.checkSlidingWindow(
      userId,
      'day',
      limits.requestsPerDay,
      86400,
    );

    if (!dayResult.allowed) {
      return {
        ...dayResult,
        reason: 'Per-day rate limit exceeded',
      };
    }

    // Check cost limit if tracking enabled
    if (this.costTracking) {
      const costResult = await this.checkCostLimit(userId, limits.costLimit);
      if (!costResult.allowed) {
        return {
          ...costResult,
          reason: 'Daily cost limit exceeded',
        };
      }
    }

    // All checks passed - record the request
    await this.recordRequest(userId, tier, priority);

    return {
      allowed: true,
      limit: limits.requestsPerMinute,
      remaining: limits.requestsPerMinute - minuteResult.count - 1,
      resetTime: Date.now() + 60000,
    };
  }

  /**
   * Check sliding window rate limit using Redis sorted set
   */
  private async checkSlidingWindow(
    userId: string,
    window: 'minute' | 'hour' | 'day',
    limit: number,
    windowSeconds: number,
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    count: number;
  }> {
    const key = `${this.keyPrefix}${userId}:${window}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await this.redis.zremrangebyscore(key, '-inf', windowStart.toString());

      // Count requests in window
      const count = await this.redis.zcount(key, windowStart.toString(), '+inf');

      const allowed = count < limit;
      const resetTime = now + windowMs;

      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - count),
        resetTime,
        count,
      };
    } catch (error) {
      logger.error({ error, userId, window }, 'Sliding window check failed');
      // Fail open
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetTime: now + windowMs,
        count: 0,
      };
    }
  }

  /**
   * Record a request in all time windows
   */
  private async recordRequest(
    userId: string,
    tier: RateLimitTier,
    priority: RequestPriority,
  ): Promise<void> {
    const now = Date.now();
    const requestId = `${now}:${Math.random()}`;

    const pipeline = this.redis.pipeline();

    // Add to sliding windows
    for (const window of ['minute', 'hour', 'day']) {
      const key = `${this.keyPrefix}${userId}:${window}`;
      pipeline.zadd(key, now.toString(), requestId);

      // Set expiry to 2x window size
      const expiry = window === 'minute' ? 120 : window === 'hour' ? 7200 : 172800;
      pipeline.expire(key, expiry);
    }

    await pipeline.exec();

    logger.debug({ userId, tier, priority, requestId }, 'Request recorded');
  }

  /**
   * Get current concurrent requests
   */
  private async getCurrentConcurrentRequests(userId: string): Promise<number> {
    const key = this.getConcurrentKey(userId);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Check cost limit for user
   */
  private async checkCostLimit(
    userId: string,
    costLimit: number,
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const key = `${this.keyPrefix}${userId}:cost:daily`;
    const cost = await this.redis.get(key);
    const currentCost = cost ? parseFloat(cost) : 0;

    const allowed = currentCost < costLimit;
    const now = Date.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const resetTime = tomorrow.getTime();

    return {
      allowed,
      limit: costLimit,
      remaining: Math.max(0, costLimit - currentCost),
      resetTime,
    };
  }

  /**
   * Record request cost
   */
  private async recordRequestCost(userId: string, cost: number): Promise<void> {
    const key = `${this.keyPrefix}${userId}:cost:daily`;
    await this.redis.incrbyfloat(key, cost);

    // Expire at end of day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    await this.redis.expire(key, ttl);
  }

  /**
   * Get tier from request (could be based on API key, user role, etc.)
   */
  private getTierFromRequest(req: Request): RateLimitTier {
    // Check headers first
    const headerTier = req.headers['x-rate-limit-tier'] as RateLimitTier;
    if (headerTier && Object.values(RateLimitTier).includes(headerTier)) {
      return headerTier;
    }

    // Check user object (set by auth middleware)
    const user = (req as any).user;
    if (user?.tier) {
      return user.tier as RateLimitTier;
    }

    // Default to FREE tier
    return RateLimitTier.FREE;
  }

  /**
   * Get user ID from request
   */
  private getUserIdFromRequest(req: Request): string {
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // Fall back to IP address
    return `ip:${req.ip || req.socket.remoteAddress}`;
  }

  /**
   * Get priority from request
   */
  private getPriorityFromRequest(req: Request): RequestPriority {
    const headerPriority = req.headers['x-request-priority'] as RequestPriority;
    if (headerPriority && Object.values(RequestPriority).includes(headerPriority)) {
      return headerPriority;
    }

    return RequestPriority.NORMAL;
  }

  /**
   * Get concurrent requests key
   */
  private getConcurrentKey(userId: string): string {
    return `${this.keyPrefix}${userId}:concurrent`;
  }

  /**
   * Start adaptive throttling based on system load
   */
  private startAdaptiveMonitoring(): void {
    setInterval(async () => {
      try {
        // TODO: Monitor system metrics (CPU, memory, query latency)
        // Dynamically adjust rate limits based on load

        logger.debug('Adaptive throttling check completed');
      } catch (error) {
        logger.error({ error }, 'Adaptive monitoring failed');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get rate limit status for user
   */
  async getStatus(userId: string, tier: RateLimitTier): Promise<{
    tier: RateLimitTier;
    limits: TierLimits;
    usage: {
      minute: number;
      hour: number;
      day: number;
      concurrent: number;
      cost: number;
    };
    resetTimes: {
      minute: number;
      hour: number;
      day: number;
    };
  }> {
    const limits = this.tierLimits[tier];
    const now = Date.now();

    const [minuteCount, hourCount, dayCount, concurrentCount, costStr] = await Promise.all([
      this.redis.zcount(`${this.keyPrefix}${userId}:minute`, (now - 60000).toString(), '+inf'),
      this.redis.zcount(`${this.keyPrefix}${userId}:hour`, (now - 3600000).toString(), '+inf'),
      this.redis.zcount(`${this.keyPrefix}${userId}:day`, (now - 86400000).toString(), '+inf'),
      this.getCurrentConcurrentRequests(userId),
      this.redis.get(`${this.keyPrefix}${userId}:cost:daily`),
    ]);

    return {
      tier,
      limits,
      usage: {
        minute: minuteCount,
        hour: hourCount,
        day: dayCount,
        concurrent: concurrentCount,
        cost: costStr ? parseFloat(costStr) : 0,
      },
      resetTimes: {
        minute: now + 60000,
        hour: now + 3600000,
        day: (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          return tomorrow.getTime();
        })(),
      },
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Create default rate limiter instance
export function createTieredRateLimiter(config?: Partial<RateLimitConfig>): TieredRateLimiter {
  const defaultConfig: RateLimitConfig = {
    tiers: DEFAULT_TIER_LIMITS,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'rl:',
    },
    costTracking: true,
    adaptiveThrottling: true,
    queueing: false,
  };

  return new TieredRateLimiter({ ...defaultConfig, ...config });
}
