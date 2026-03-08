"use strict";
// @ts-nocheck
/**
 * Tenant-based Rate Limiting Service for GraphQL Cost Control
 * Implements multi-tier, per-tenant rate limiting with dynamic configuration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRateLimitService = void 0;
exports.getTenantRateLimitService = getTenantRateLimitService;
const RateLimiter_js_1 = require("../../services/RateLimiter.js");
const CostCalculator_js_1 = require("./CostCalculator.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
/**
 * TenantRateLimitService - Manages per-tenant GraphQL cost-based rate limiting
 */
class TenantRateLimitService {
    MINUTE_MS = 60 * 1000;
    HOUR_MS = 60 * 60 * 1000;
    /**
     * Check if a query is allowed under tenant rate limits
     */
    async checkLimit(options) {
        const { tenantId, userId, tier = 'free', cost, operationName } = options;
        try {
            // Get cost calculator to retrieve tenant limits
            const costCalculator = await (0, CostCalculator_js_1.getCostCalculator)();
            const limits = costCalculator.getTenantLimits(tenantId, tier);
            // 1. Check per-query limit (hard limit, not rate-based)
            if (cost > limits.maxCostPerQuery) {
                logger.warn({
                    tenantId,
                    userId,
                    operationName,
                    cost,
                    limit: limits.maxCostPerQuery,
                }, 'Query cost exceeds per-query limit');
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
            const minuteResult = await RateLimiter_js_1.rateLimiter.consume(minuteKey, cost, limits.maxCostPerMinute, this.MINUTE_MS);
            if (!minuteResult.allowed) {
                logger.warn({
                    tenantId,
                    userId,
                    operationName,
                    cost,
                    consumed: minuteResult.total,
                    limit: limits.maxCostPerMinute,
                    remaining: minuteResult.remaining,
                }, 'Tenant exceeded per-minute cost limit');
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
            const hourResult = await RateLimiter_js_1.rateLimiter.consume(hourKey, cost, limits.maxCostPerHour, this.HOUR_MS);
            if (!hourResult.allowed) {
                // Rollback minute consumption since hour limit was exceeded
                await RateLimiter_js_1.rateLimiter.consume(minuteKey, -cost, limits.maxCostPerMinute, this.MINUTE_MS);
                logger.warn({
                    tenantId,
                    userId,
                    operationName,
                    cost,
                    consumed: hourResult.total,
                    limit: limits.maxCostPerHour,
                    remaining: hourResult.remaining,
                }, 'Tenant exceeded per-hour cost limit');
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
                const userResult = await RateLimiter_js_1.rateLimiter.consume(userKey, cost, userLimit, this.MINUTE_MS);
                if (!userResult.allowed) {
                    // Rollback tenant consumption
                    await RateLimiter_js_1.rateLimiter.consume(minuteKey, -cost, limits.maxCostPerMinute, this.MINUTE_MS);
                    await RateLimiter_js_1.rateLimiter.consume(hourKey, -cost, limits.maxCostPerHour, this.HOUR_MS);
                    logger.warn({
                        tenantId,
                        userId,
                        operationName,
                        cost,
                        consumed: userResult.total,
                        limit: userLimit,
                    }, 'User exceeded per-minute cost limit');
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
            logger.debug({
                tenantId,
                userId,
                operationName,
                cost,
                remainingMinute: minuteResult.remaining,
                remainingHour: hourResult.remaining,
            }, 'Query allowed under rate limits');
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
        }
        catch (error) {
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
    async getTenantUsage(tenantId, tier = 'free') {
        const costCalculator = await (0, CostCalculator_js_1.getCostCalculator)();
        const limits = costCalculator.getTenantLimits(tenantId, tier);
        // Get current consumption from Redis
        const minuteKey = `rate_limit:cost:tenant:${tenantId}:minute`;
        const hourKey = `rate_limit:cost:tenant:${tenantId}:hour`;
        const redis = (await Promise.resolve().then(() => __importStar(require('../../config/database.js')))).getRedisClient();
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
        }
        catch (error) {
            logger.error({ error, tenantId }, 'Failed to get tenant usage');
            return {
                minuteUsage: 0,
                hourUsage: 0,
                limits,
            };
        }
    }
}
exports.TenantRateLimitService = TenantRateLimitService;
// Singleton instance
let tenantRateLimitServiceInstance = null;
/**
 * Get or create the singleton tenant rate limit service instance
 */
function getTenantRateLimitService() {
    if (!tenantRateLimitServiceInstance) {
        tenantRateLimitServiceInstance = new TenantRateLimitService();
    }
    return tenantRateLimitServiceInstance;
}
