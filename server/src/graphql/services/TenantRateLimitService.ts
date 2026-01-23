// @ts-nocheck
/**
 * Tenant-based Rate Limiting Service for GraphQL Cost Control
 * Implements multi-tier, per-tenant rate limiting with dynamic configuration
 */

import { rateLimiter, type RateLimitResult } from '../../services/RateLimiter.js';
import { getCostCalculator, type TenantTierLimits } from './CostCalculator.js';
import pino from 'pino';

const logger = (pino as any)();

export interface TenantRateLimitOptions {
  tenantId: string;
  userId?: string;
  tier?: string;
  cost: number;
  operationName?: string;
}

export interface TenantRateLimitResult {
  allowed: boolean;
  cost: number;
  limits: {
    perQuery: number;
    perMinute: number;
    perHour: number;
  };
  remaining: {
    perMinute: number;
    perHour: number;
  };
  reset: {
    perMinute: number;
    perHour: number;
  };
  retryAfter?: number;
  reason?: string;
}

/**
 * TenantRateLimitService - Manages per-tenant GraphQL cost-based rate limiting
 */
export class TenantRateLimitService {
  private readonly MINUTE_MS = 60 * 1000;
  private readonly HOUR_MS = 60 * 60 * 1000;

  /**
   * Check if a query is allowed under tenant rate limits
   */
  async checkLimit(options: TenantRateLimitOptions): Promise<TenantRateLimitResult> {
    const { tenantId, userId, tier = 'free', cost, operationName } = options;

    try {
      // Get cost calculator to retrieve tenant limits
      const costCalculator = await getCostCalculator();
      const limits = costCalculator.getTenantLimits(tenantId, tier);

      // 1. Check per-query limit (hard limit, not rate-based)
      if (cost > limits.maxCostPerQuery) {
        logger.warn(
          {
            tenantId,
            userId,
            operationName,
            cost,
            limit: limits.maxCostPerQuery,
          },
          'Query cost exceeds per-query limit'
        );

        return {
          allowed: false,
          cost,
          limits: {
            perQuery: limits.maxCostPerQuery,
            perMinute: limits.maxCostPerMinute,
            perHour: limits.maxCostPerHour,
          },
          remaining: {
            perMinute: 0,
            perHour: 0,
          },
          reset: {
            perMinute: Date.now() + this.MINUTE_MS,
            perHour: Date.now() + this.HOUR_MS,
          },
          reason: 'QUERY_TOO_EXPENSIVE',
        };
      }

      // 2. Check per-minute tenant limit
      const minuteKey = `cost:tenant:${tenantId}:minute`;
      const minuteResult = await rateLimiter.consume(
        minuteKey,
        cost,
        limits.maxCostPerMinute,
        this.MINUTE_MS
      );

      if (!minuteResult.allowed) {
        logger.warn(
          {
            tenantId,
            userId,
            operationName,
            cost,
            consumed: minuteResult.total,
            limit: limits.maxCostPerMinute,
            remaining: minuteResult.remaining,
          },
          'Tenant exceeded per-minute cost limit'
        );

        return {
          allowed: false,
          cost,
          limits: {
            perQuery: limits.maxCostPerQuery,
            perMinute: limits.maxCostPerMinute,
            perHour: limits.maxCostPerHour,
          },
          remaining: {
            perMinute: minuteResult.remaining,
            perHour: 0,
          },
          reset: {
            perMinute: minuteResult.reset,
            perHour: Date.now() + this.HOUR_MS,
          },
          retryAfter: Math.ceil((minuteResult.reset - Date.now()) / 1000),
          reason: 'TENANT_RATE_LIMIT_EXCEEDED',
        };
      }

      // 3. Check per-hour tenant limit
      const hourKey = `cost:tenant:${tenantId}:hour`;
      const hourResult = await rateLimiter.consume(
        hourKey,
        cost,
        limits.maxCostPerHour,
        this.HOUR_MS
      );

      if (!hourResult.allowed) {
        // Rollback minute consumption since hour limit was exceeded
        await rateLimiter.consume(minuteKey, -cost, limits.maxCostPerMinute, this.MINUTE_MS);

        logger.warn(
          {
            tenantId,
            userId,
            operationName,
            cost,
            consumed: hourResult.total,
            limit: limits.maxCostPerHour,
            remaining: hourResult.remaining,
          },
          'Tenant exceeded per-hour cost limit'
        );

        return {
          allowed: false,
          cost,
          limits: {
            perQuery: limits.maxCostPerQuery,
            perMinute: limits.maxCostPerMinute,
            perHour: limits.maxCostPerHour,
          },
          remaining: {
            perMinute: minuteResult.remaining,
            perHour: hourResult.remaining,
          },
          reset: {
            perMinute: minuteResult.reset,
            perHour: hourResult.reset,
          },
          retryAfter: Math.ceil((hourResult.reset - Date.now()) / 1000),
          reason: 'TENANT_HOURLY_LIMIT_EXCEEDED',
        };
      }

      // 4. Optional: Check per-user limit within tenant
      if (userId) {
        const userKey = `cost:user:${userId}:minute`;
        const userLimit = limits.maxCostPerMinute * 0.3; // User can use 30% of tenant limit
        const userResult = await rateLimiter.consume(userKey, cost, userLimit, this.MINUTE_MS);

        if (!userResult.allowed) {
          // Rollback tenant consumption
          await rateLimiter.consume(minuteKey, -cost, limits.maxCostPerMinute, this.MINUTE_MS);
          await rateLimiter.consume(hourKey, -cost, limits.maxCostPerHour, this.HOUR_MS);

          logger.warn(
            {
              tenantId,
              userId,
              operationName,
              cost,
              consumed: userResult.total,
              limit: userLimit,
            },
            'User exceeded per-minute cost limit'
          );

          return {
            allowed: false,
            cost,
            limits: {
              perQuery: limits.maxCostPerQuery,
              perMinute: limits.maxCostPerMinute,
              perHour: limits.maxCostPerHour,
            },
            remaining: {
              perMinute: userResult.remaining,
              perHour: hourResult.remaining,
            },
            reset: {
              perMinute: userResult.reset,
              perHour: hourResult.reset,
            },
            retryAfter: Math.ceil((userResult.reset - Date.now()) / 1000),
            reason: 'USER_RATE_LIMIT_EXCEEDED',
          };
        }
      }

      // All checks passed
      logger.debug(
        {
          tenantId,
          userId,
          operationName,
          cost,
          remainingMinute: minuteResult.remaining,
          remainingHour: hourResult.remaining,
        },
        'Query allowed under rate limits'
      );

      return {
        allowed: true,
        cost,
        limits: {
          perQuery: limits.maxCostPerQuery,
          perMinute: limits.maxCostPerMinute,
          perHour: limits.maxCostPerHour,
        },
        remaining: {
          perMinute: minuteResult.remaining,
          perHour: hourResult.remaining,
        },
        reset: {
          perMinute: minuteResult.reset,
          perHour: hourResult.reset,
        },
      };
    } catch (error: any) {
      logger.error({ error, tenantId, userId }, 'Error checking tenant rate limit');

      // Fail open - allow request but log error
      return {
        allowed: true,
        cost,
        limits: {
          perQuery: 1000,
          perMinute: 10000,
          perHour: 100000,
        },
        remaining: {
          perMinute: 10000,
          perHour: 100000,
        },
        reset: {
          perMinute: Date.now() + this.MINUTE_MS,
          perHour: Date.now() + this.HOUR_MS,
        },
        reason: 'RATE_LIMIT_CHECK_FAILED',
      };
    }
  }

  /**
   * Get current usage for a tenant
   */
  async getTenantUsage(
    tenantId: string,
    tier: string = 'free'
  ): Promise<{
    minuteUsage: number;
    hourUsage: number;
    limits: TenantTierLimits;
  }> {
    const costCalculator = await getCostCalculator();
    const limits = costCalculator.getTenantLimits(tenantId, tier);

    // Get current consumption from Redis
    const minuteKey = `rate_limit:cost:tenant:${tenantId}:minute`;
    const hourKey = `rate_limit:cost:tenant:${tenantId}:hour`;

    const redis = (await import('../../config/database.js')).getRedisClient();
    if (!redis) {
      return {
        minuteUsage: 0,
        hourUsage: 0,
        limits,
      };
    }

    try {
      const [minuteUsage, hourUsage] = await Promise.all([
        redis.get(minuteKey).then((val) => parseInt(val || '0', 10)),
        redis.get(hourKey).then((val) => parseInt(val || '0', 10)),
      ]);

      return {
        minuteUsage,
        hourUsage,
        limits,
      };
    } catch (error: any) {
      logger.error({ error, tenantId }, 'Failed to get tenant usage');
      return {
        minuteUsage: 0,
        hourUsage: 0,
        limits,
      };
    }
  }
}

// Singleton instance
let tenantRateLimitServiceInstance: TenantRateLimitService | null = null;

/**
 * Get or create the singleton tenant rate limit service instance
 */
export function getTenantRateLimitService(): TenantRateLimitService {
  if (!tenantRateLimitServiceInstance) {
    tenantRateLimitServiceInstance = new TenantRateLimitService();
  }
  return tenantRateLimitServiceInstance;
}
