"use strict";
/**
 * Secure API Gateway Throttling and Quota Enforcement for Switchboard
 * Fine-grained rate limiting, quotas, and authentication controls
 * to protect upstream Summit services from overload and abuse.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayThrottler = exports.GatewayThrottler = exports.ApiKeySchema = exports.DEFAULT_TIER_CONFIGS = exports.TierConfigSchema = exports.RateLimitTierSchema = exports.RateLimitAlgorithmSchema = void 0;
const zod_1 = require("zod");
const events_1 = require("events");
const crypto_1 = require("crypto");
// Rate limit algorithm types
exports.RateLimitAlgorithmSchema = zod_1.z.enum(['token_bucket', 'sliding_window', 'fixed_window', 'leaky_bucket']);
// Rate limit tier
exports.RateLimitTierSchema = zod_1.z.enum(['free', 'basic', 'premium', 'enterprise', 'internal', 'unlimited']);
// Tier configuration
exports.TierConfigSchema = zod_1.z.object({
    tier: exports.RateLimitTierSchema,
    requestsPerSecond: zod_1.z.number().int().min(0),
    requestsPerMinute: zod_1.z.number().int().min(0),
    requestsPerHour: zod_1.z.number().int().min(0),
    requestsPerDay: zod_1.z.number().int().min(0),
    burstLimit: zod_1.z.number().int().min(0),
    concurrentRequests: zod_1.z.number().int().min(0),
    quotaLimit: zod_1.z.number().int().min(0).optional(), // Monthly quota
    costLimit: zod_1.z.number().min(0).optional(), // Cost-based quota
    priority: zod_1.z.number().int().min(0).max(100),
});
// Default tier configurations
exports.DEFAULT_TIER_CONFIGS = {
    free: {
        tier: 'free',
        requestsPerSecond: 1,
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 1000,
        burstLimit: 5,
        concurrentRequests: 2,
        quotaLimit: 10000,
        priority: 10,
    },
    basic: {
        tier: 'basic',
        requestsPerSecond: 10,
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 20,
        concurrentRequests: 5,
        quotaLimit: 100000,
        priority: 30,
    },
    premium: {
        tier: 'premium',
        requestsPerSecond: 50,
        requestsPerMinute: 300,
        requestsPerHour: 10000,
        requestsPerDay: 100000,
        burstLimit: 100,
        concurrentRequests: 20,
        quotaLimit: 1000000,
        priority: 50,
    },
    enterprise: {
        tier: 'enterprise',
        requestsPerSecond: 200,
        requestsPerMinute: 1000,
        requestsPerHour: 50000,
        requestsPerDay: 500000,
        burstLimit: 500,
        concurrentRequests: 100,
        quotaLimit: 10000000,
        priority: 70,
    },
    internal: {
        tier: 'internal',
        requestsPerSecond: 1000,
        requestsPerMinute: 10000,
        requestsPerHour: 500000,
        requestsPerDay: 5000000,
        burstLimit: 2000,
        concurrentRequests: 500,
        priority: 90,
    },
    unlimited: {
        tier: 'unlimited',
        requestsPerSecond: 0, // 0 = unlimited
        requestsPerMinute: 0,
        requestsPerHour: 0,
        requestsPerDay: 0,
        burstLimit: 0,
        concurrentRequests: 0,
        priority: 100,
    },
};
// API key schema
exports.ApiKeySchema = zod_1.z.object({
    id: zod_1.z.string(),
    key: zod_1.z.string(), // Hashed
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    tier: exports.RateLimitTierSchema,
    permissions: zod_1.z.array(zod_1.z.string()),
    scopes: zod_1.z.array(zod_1.z.string()).optional(),
    allowedIPs: zod_1.z.array(zod_1.z.string()).optional(),
    allowedOrigins: zod_1.z.array(zod_1.z.string()).optional(),
    rateOverrides: exports.TierConfigSchema.partial().optional(),
    quotaUsed: zod_1.z.number().default(0),
    lastUsedAt: zod_1.z.date().optional(),
    expiresAt: zod_1.z.date().optional(),
    isActive: zod_1.z.boolean().default(true),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// In-memory storage implementation
class InMemoryStorage {
    data = new Map();
    async get(key) {
        const entry = this.data.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.data.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, expiryMs) {
        this.data.set(key, {
            value,
            expiresAt: expiryMs ? Date.now() + expiryMs : undefined,
        });
    }
    async incr(key) {
        const current = await this.get(key);
        const newValue = (parseInt(current || '0', 10) + 1).toString();
        const entry = this.data.get(key);
        await this.set(key, newValue, entry?.expiresAt ? entry.expiresAt - Date.now() : undefined);
        return parseInt(newValue, 10);
    }
    async expire(key, ms) {
        const entry = this.data.get(key);
        if (entry) {
            entry.expiresAt = Date.now() + ms;
        }
    }
    async del(key) {
        this.data.delete(key);
    }
}
class ConsoleLogger {
    info(m, meta) { console.log(JSON.stringify({ level: 'info', message: m, ...meta })); }
    warn(m, meta) { console.warn(JSON.stringify({ level: 'warn', message: m, ...meta })); }
    error(m, meta) { console.error(JSON.stringify({ level: 'error', message: m, ...meta })); }
    debug(m, meta) { console.debug(JSON.stringify({ level: 'debug', message: m, ...meta })); }
}
/**
 * Switchboard Gateway Throttler
 * Comprehensive rate limiting and quota enforcement
 */
class GatewayThrottler extends events_1.EventEmitter {
    config;
    apiKeys = new Map();
    buckets = new Map();
    slidingWindows = new Map();
    concurrentRequests = new Map();
    constructor(config = {}) {
        super();
        this.config = {
            algorithm: config.algorithm || 'token_bucket',
            tierConfigs: config.tierConfigs || exports.DEFAULT_TIER_CONFIGS,
            defaultTier: config.defaultTier || 'free',
            enableQuotas: config.enableQuotas ?? true,
            quotaResetDay: config.quotaResetDay || 1,
            bypassTokens: config.bypassTokens || [],
            logger: config.logger || new ConsoleLogger(),
            metrics: config.metrics || { increment: () => { }, histogram: () => { }, gauge: () => { } },
            storage: config.storage || new InMemoryStorage(),
        };
    }
    /**
     * Register an API key
     */
    registerApiKey(apiKey) {
        this.apiKeys.set(apiKey.id, apiKey);
        this.config.logger.info('API key registered', { keyId: apiKey.id, tier: apiKey.tier });
    }
    /**
     * Validate and authenticate API key
     */
    async authenticateApiKey(rawKey) {
        const hashedKey = this.hashApiKey(rawKey);
        for (const [id, apiKey] of this.apiKeys) {
            if (apiKey.key === hashedKey) {
                if (!apiKey.isActive) {
                    this.config.logger.warn('Inactive API key used', { keyId: id });
                    return null;
                }
                if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
                    this.config.logger.warn('Expired API key used', { keyId: id });
                    return null;
                }
                // Update last used
                apiKey.lastUsedAt = new Date();
                return apiKey;
            }
        }
        return null;
    }
    /**
     * Check throttle for a request
     */
    async checkThrottle(context, rawApiKey) {
        const startTime = performance.now();
        // Check bypass tokens
        if (rawApiKey && this.config.bypassTokens.includes(rawApiKey)) {
            return this.buildAllowedDecision('unlimited', true);
        }
        // Authenticate API key
        let apiKey = null;
        let tier = this.config.defaultTier;
        if (rawApiKey) {
            apiKey = await this.authenticateApiKey(rawApiKey);
            if (apiKey) {
                tier = apiKey.tier;
                // Check IP allowlist
                if (apiKey.allowedIPs?.length && !apiKey.allowedIPs.includes(context.ipAddress)) {
                    this.config.metrics.increment('gateway.throttle.blocked', { reason: 'ip_not_allowed' });
                    return this.buildBlockedDecision(tier, 'IP_NOT_ALLOWED', 'IP address not in allowlist');
                }
                // Check origin allowlist
                if (apiKey.allowedOrigins?.length && context.origin && !apiKey.allowedOrigins.includes(context.origin)) {
                    this.config.metrics.increment('gateway.throttle.blocked', { reason: 'origin_not_allowed' });
                    return this.buildBlockedDecision(tier, 'ORIGIN_NOT_ALLOWED', 'Origin not in allowlist');
                }
            }
            else {
                this.config.metrics.increment('gateway.throttle.blocked', { reason: 'invalid_api_key' });
                return this.buildBlockedDecision(tier, 'INVALID_API_KEY', 'Invalid or expired API key');
            }
        }
        // Get tier configuration
        const tierConfig = this.getTierConfig(apiKey);
        // Check concurrent requests
        const concurrentKey = this.getConcurrentKey(context, apiKey);
        const currentConcurrent = this.concurrentRequests.get(concurrentKey) || 0;
        if (tierConfig.concurrentRequests > 0 && currentConcurrent >= tierConfig.concurrentRequests) {
            this.config.metrics.increment('gateway.throttle.blocked', { reason: 'concurrent_limit', tier });
            return this.buildBlockedDecision(tier, 'CONCURRENT_LIMIT', 'Too many concurrent requests', 1000);
        }
        // Check rate limit
        const rateLimitResult = await this.checkRateLimit(context, apiKey, tierConfig);
        if (!rateLimitResult.allowed) {
            this.config.metrics.increment('gateway.throttle.blocked', { reason: 'rate_limit', tier });
            return {
                allowed: false,
                rateLimit: rateLimitResult,
                authenticated: !!apiKey,
                tier,
                headers: this.buildRateLimitHeaders(rateLimitResult),
                blocked: {
                    reason: rateLimitResult.reason || 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfterMs: rateLimitResult.retryAfterMs,
                },
            };
        }
        // Check quota
        let quotaResult;
        if (this.config.enableQuotas && tierConfig.quotaLimit) {
            quotaResult = await this.checkQuota(context, apiKey, tierConfig);
            if (!quotaResult.allowed) {
                this.config.metrics.increment('gateway.throttle.blocked', { reason: 'quota', tier });
                return {
                    allowed: false,
                    rateLimit: rateLimitResult,
                    quota: quotaResult,
                    authenticated: !!apiKey,
                    tier,
                    headers: this.buildRateLimitHeaders(rateLimitResult, quotaResult),
                    blocked: {
                        reason: 'Monthly quota exceeded',
                        code: 'QUOTA_EXCEEDED',
                    },
                };
            }
        }
        // Increment concurrent request counter
        this.concurrentRequests.set(concurrentKey, currentConcurrent + 1);
        // Record metrics
        const duration = performance.now() - startTime;
        this.config.metrics.increment('gateway.throttle.allowed', { tier });
        this.config.metrics.histogram('gateway.throttle.check_duration', duration);
        return {
            allowed: true,
            rateLimit: rateLimitResult,
            quota: quotaResult,
            authenticated: !!apiKey,
            tier,
            headers: this.buildRateLimitHeaders(rateLimitResult, quotaResult),
        };
    }
    /**
     * Release concurrent request slot
     */
    releaseRequest(context, apiKey) {
        const concurrentKey = this.getConcurrentKey(context, apiKey);
        const current = this.concurrentRequests.get(concurrentKey) || 0;
        if (current > 0) {
            this.concurrentRequests.set(concurrentKey, current - 1);
        }
    }
    /**
     * Check rate limit based on algorithm
     */
    async checkRateLimit(context, apiKey, tierConfig) {
        switch (this.config.algorithm) {
            case 'token_bucket':
                return this.checkTokenBucket(context, apiKey, tierConfig);
            case 'sliding_window':
                return this.checkSlidingWindow(context, apiKey, tierConfig);
            case 'fixed_window':
                return this.checkFixedWindow(context, apiKey, tierConfig);
            case 'leaky_bucket':
                return this.checkLeakyBucket(context, apiKey, tierConfig);
            default:
                return this.checkTokenBucket(context, apiKey, tierConfig);
        }
    }
    /**
     * Token bucket algorithm
     */
    async checkTokenBucket(context, apiKey, tierConfig) {
        const key = this.getRateLimitKey(context, apiKey);
        const now = Date.now();
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = {
                tokens: tierConfig.burstLimit || tierConfig.requestsPerSecond,
                lastRefill: now,
                capacity: tierConfig.burstLimit || tierConfig.requestsPerSecond,
                refillRate: tierConfig.requestsPerSecond,
            };
            this.buckets.set(key, bucket);
        }
        // Refill tokens
        const elapsed = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.refillRate);
        bucket.lastRefill = now;
        // Check if we have tokens
        const cost = context.cost || 1;
        if (bucket.tokens >= cost) {
            bucket.tokens -= cost;
            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                limit: bucket.capacity,
                resetAt: new Date(now + ((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000),
                tier: tierConfig.tier,
            };
        }
        // Calculate retry after
        const tokensNeeded = cost - bucket.tokens;
        const retryAfterMs = Math.ceil((tokensNeeded / bucket.refillRate) * 1000);
        return {
            allowed: false,
            remaining: 0,
            limit: bucket.capacity,
            resetAt: new Date(now + retryAfterMs),
            retryAfterMs,
            tier: tierConfig.tier,
            reason: 'Token bucket exhausted',
        };
    }
    /**
     * Sliding window algorithm
     */
    async checkSlidingWindow(context, apiKey, tierConfig) {
        const key = this.getRateLimitKey(context, apiKey);
        const now = Date.now();
        const windowMs = 60000; // 1 minute window
        let window = this.slidingWindows.get(key) || [];
        // Remove old entries
        window = window.filter((entry) => now - entry.timestamp < windowMs);
        // Count requests in window
        const count = window.reduce((sum, entry) => sum + entry.count, 0);
        if (count >= tierConfig.requestsPerMinute) {
            const oldestEntry = window[0];
            const retryAfterMs = oldestEntry ? windowMs - (now - oldestEntry.timestamp) : windowMs;
            return {
                allowed: false,
                remaining: 0,
                limit: tierConfig.requestsPerMinute,
                resetAt: new Date(now + retryAfterMs),
                retryAfterMs,
                tier: tierConfig.tier,
                reason: 'Sliding window limit exceeded',
            };
        }
        // Add new entry
        window.push({ count: context.cost || 1, timestamp: now });
        this.slidingWindows.set(key, window);
        return {
            allowed: true,
            remaining: tierConfig.requestsPerMinute - count - 1,
            limit: tierConfig.requestsPerMinute,
            resetAt: new Date(now + windowMs),
            tier: tierConfig.tier,
        };
    }
    /**
     * Fixed window algorithm
     */
    async checkFixedWindow(context, apiKey, tierConfig) {
        const key = this.getRateLimitKey(context, apiKey);
        const windowMs = 60000;
        const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
        const windowKey = `${key}:${windowStart}`;
        const countStr = await this.config.storage.get(windowKey);
        const count = parseInt(countStr || '0', 10);
        if (count >= tierConfig.requestsPerMinute) {
            const resetAt = new Date(windowStart + windowMs);
            const retryAfterMs = resetAt.getTime() - Date.now();
            return {
                allowed: false,
                remaining: 0,
                limit: tierConfig.requestsPerMinute,
                resetAt,
                retryAfterMs,
                tier: tierConfig.tier,
                reason: 'Fixed window limit exceeded',
            };
        }
        await this.config.storage.set(windowKey, (count + 1).toString(), windowMs);
        return {
            allowed: true,
            remaining: tierConfig.requestsPerMinute - count - 1,
            limit: tierConfig.requestsPerMinute,
            resetAt: new Date(windowStart + windowMs),
            tier: tierConfig.tier,
        };
    }
    /**
     * Leaky bucket algorithm
     */
    async checkLeakyBucket(context, apiKey, tierConfig) {
        // Similar to token bucket but requests leak at constant rate
        return this.checkTokenBucket(context, apiKey, tierConfig);
    }
    /**
     * Check quota usage
     */
    async checkQuota(context, apiKey, tierConfig) {
        if (!tierConfig.quotaLimit) {
            return {
                allowed: true,
                used: 0,
                limit: 0,
                remaining: 0,
                resetAt: new Date(),
                percentage: 0,
            };
        }
        const quotaKey = this.getQuotaKey(context, apiKey);
        const usedStr = await this.config.storage.get(quotaKey);
        const used = parseInt(usedStr || '0', 10);
        // Calculate reset date (first of next month)
        const now = new Date();
        const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, this.config.quotaResetDay);
        const cost = context.cost || 1;
        if (used + cost > tierConfig.quotaLimit) {
            return {
                allowed: false,
                used,
                limit: tierConfig.quotaLimit,
                remaining: Math.max(0, tierConfig.quotaLimit - used),
                resetAt,
                percentage: (used / tierConfig.quotaLimit) * 100,
            };
        }
        // Increment usage
        await this.config.storage.set(quotaKey, (used + cost).toString(), resetAt.getTime() - Date.now());
        // Update API key if present
        if (apiKey) {
            apiKey.quotaUsed = used + cost;
        }
        return {
            allowed: true,
            used: used + cost,
            limit: tierConfig.quotaLimit,
            remaining: tierConfig.quotaLimit - used - cost,
            resetAt,
            percentage: ((used + cost) / tierConfig.quotaLimit) * 100,
        };
    }
    /**
     * Get tier configuration with overrides
     */
    getTierConfig(apiKey) {
        const baseConfig = this.config.tierConfigs[apiKey?.tier || this.config.defaultTier];
        if (!apiKey?.rateOverrides) {
            return baseConfig;
        }
        return {
            ...baseConfig,
            ...apiKey.rateOverrides,
        };
    }
    /**
     * Build allowed decision
     */
    buildAllowedDecision(tier, authenticated) {
        return {
            allowed: true,
            rateLimit: {
                allowed: true,
                remaining: Infinity,
                limit: 0,
                resetAt: new Date(),
                tier,
            },
            authenticated,
            tier,
            headers: {},
        };
    }
    /**
     * Build blocked decision
     */
    buildBlockedDecision(tier, code, reason, retryAfterMs) {
        return {
            allowed: false,
            rateLimit: {
                allowed: false,
                remaining: 0,
                limit: 0,
                resetAt: new Date(),
                tier,
                reason,
                retryAfterMs,
            },
            authenticated: false,
            tier,
            headers: retryAfterMs ? { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } : {},
            blocked: { reason, code, retryAfterMs },
        };
    }
    /**
     * Build rate limit headers
     */
    buildRateLimitHeaders(rateLimit, quota) {
        const headers = {
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt.getTime() / 1000)),
        };
        if (rateLimit.retryAfterMs) {
            headers['Retry-After'] = String(Math.ceil(rateLimit.retryAfterMs / 1000));
        }
        if (quota) {
            headers['X-Quota-Limit'] = String(quota.limit);
            headers['X-Quota-Remaining'] = String(quota.remaining);
            headers['X-Quota-Reset'] = String(Math.floor(quota.resetAt.getTime() / 1000));
        }
        return headers;
    }
    /**
     * Get rate limit key
     */
    getRateLimitKey(context, apiKey) {
        if (apiKey) {
            return `rate:${apiKey.id}`;
        }
        return `rate:ip:${context.ipAddress}`;
    }
    /**
     * Get quota key
     */
    getQuotaKey(context, apiKey) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (apiKey) {
            return `quota:${apiKey.id}:${month}`;
        }
        return `quota:ip:${context.ipAddress}:${month}`;
    }
    /**
     * Get concurrent request key
     */
    getConcurrentKey(context, apiKey) {
        if (apiKey) {
            return `concurrent:${apiKey.id}`;
        }
        return `concurrent:ip:${context.ipAddress}`;
    }
    /**
     * Hash API key
     */
    hashApiKey(rawKey) {
        return (0, crypto_1.createHash)('sha256').update(rawKey).digest('hex');
    }
    /**
     * Generate new API key
     */
    generateApiKey(data) {
        const rawKey = `sk_${crypto.randomUUID().replace(/-/g, '')}`;
        const hashedKey = this.hashApiKey(rawKey);
        const apiKey = {
            ...data,
            id: crypto.randomUUID(),
            key: hashedKey,
            quotaUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.registerApiKey(apiKey);
        return { apiKey, rawKey };
    }
    /**
     * Revoke API key
     */
    revokeApiKey(keyId) {
        const apiKey = this.apiKeys.get(keyId);
        if (apiKey) {
            apiKey.isActive = false;
            apiKey.updatedAt = new Date();
            this.config.logger.info('API key revoked', { keyId });
            return true;
        }
        return false;
    }
    /**
     * Get usage statistics
     */
    getUsageStats(keyId) {
        const apiKey = this.apiKeys.get(keyId);
        if (!apiKey)
            return null;
        const tierConfig = this.getTierConfig(apiKey);
        return {
            quotaUsed: apiKey.quotaUsed,
            quotaLimit: tierConfig.quotaLimit || 0,
            tier: apiKey.tier,
            lastUsedAt: apiKey.lastUsedAt,
        };
    }
}
exports.GatewayThrottler = GatewayThrottler;
// Export singleton
exports.gatewayThrottler = new GatewayThrottler();
