"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.SlidingWindowRateLimiter = exports.rateLimitAlerter = void 0;
exports.rateLimitMiddleware = rateLimitMiddleware;
const node_events_1 = require("node:events");
const node_perf_hooks_1 = require("node:perf_hooks");
const redis_js_1 = require("../db/redis.js");
const rateLimitMetrics_js_1 = require("../observability/rateLimitMetrics.js");
const logger_js_1 = require("../utils/logger.js");
const defaultConfig = {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    userLimit: Number(process.env.RATE_LIMIT_USER_LIMIT || 120),
    ipLimit: Number(process.env.RATE_LIMIT_IP_LIMIT || 60),
    defaultApiKeyLimit: Number(process.env.RATE_LIMIT_API_KEY_LIMIT || 200),
    apiKeyQuotas: safeParseQuotaMap(process.env.RATE_LIMIT_API_KEY_QUOTAS),
    alertThreshold: Number(process.env.RATE_LIMIT_ALERT_THRESHOLD || 0.8),
    baseBackoffMs: Number(process.env.RATE_LIMIT_BACKOFF_BASE_MS || 500),
    maxBackoffMs: Number(process.env.RATE_LIMIT_BACKOFF_MAX_MS || 60_000),
    circuitBreaker: {
        failureThreshold: Number(process.env.RATE_LIMIT_CB_FAILURES || 5),
        openMs: Number(process.env.RATE_LIMIT_CB_OPEN_MS || 30_000),
        resetMs: Number(process.env.RATE_LIMIT_CB_RESET_MS || 5_000),
    },
};
function safeParseQuotaMap(json) {
    if (!json)
        return {};
    try {
        const parsed = JSON.parse(json);
        if (typeof parsed === 'object' && parsed !== null) {
            return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, Number(value)]));
        }
    }
    catch (error) {
        logger_js_1.logger.warn({ error }, 'Failed to parse RATE_LIMIT_API_KEY_QUOTAS');
    }
    return {};
}
exports.rateLimitAlerter = new node_events_1.EventEmitter();
class SlidingWindowRateLimiter {
    redis;
    memoryWindows = new Map();
    memoryViolations = new Map();
    config;
    consecutiveFailures = 0;
    circuitOpenUntil = 0;
    constructor(config = defaultConfig, redis) {
        this.config = config;
        this.redis = redis;
    }
    async consume(request) {
        const start = node_perf_hooks_1.performance.now();
        const client = this.getClient();
        try {
            const decision = client
                ? await this.consumeWithRedis(request, client)
                : await this.consumeInMemory(request);
            this.resetCircuit();
            rateLimitMetrics_js_1.rateLimitMetrics.latency.observe({ source: decision.source }, node_perf_hooks_1.performance.now() - start);
            return decision;
        }
        catch (error) {
            this.recordFailure(error);
            const decision = await this.consumeInMemory(request);
            rateLimitMetrics_js_1.rateLimitMetrics.latency.observe({ source: 'memory' }, node_perf_hooks_1.performance.now() - start);
            return decision;
        }
    }
    getClient() {
        const now = Date.now();
        if (now < this.circuitOpenUntil) {
            rateLimitMetrics_js_1.rateLimitMetrics.circuitOpen.set(1);
            return null;
        }
        if (this.redis) {
            return this.redis;
        }
        try {
            return redis_js_1.redisClient.getClient();
        }
        catch (error) {
            this.recordFailure(error);
            return null;
        }
    }
    resetCircuit() {
        if (this.consecutiveFailures !== 0 || this.circuitOpenUntil !== 0) {
            rateLimitMetrics_js_1.rateLimitMetrics.circuitOpen.set(0);
        }
        this.consecutiveFailures = 0;
        this.circuitOpenUntil = 0;
    }
    recordFailure(error) {
        this.consecutiveFailures += 1;
        logger_js_1.logger.warn({ error, consecutiveFailures: this.consecutiveFailures }, 'Rate limit Redis failure');
        if (this.consecutiveFailures >= this.config.circuitBreaker.failureThreshold) {
            this.circuitOpenUntil = Date.now() + this.config.circuitBreaker.openMs;
            rateLimitMetrics_js_1.rateLimitMetrics.circuitOpen.set(1);
            logger_js_1.logger.error({
                error,
                openMs: this.config.circuitBreaker.openMs,
            }, 'Opening rate limiter circuit breaker and failing open to in-memory mode');
        }
    }
    async consumeWithRedis(request, client) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const bucketKey = this.buildBucketKey(request);
        const violationKey = `${bucketKey}:violations`;
        const backoffKey = `${bucketKey}:backoff`;
        const memberId = `${request.identifier}:${now}:${Math.random()}`;
        const limit = this.resolveLimit(request);
        const backoffTtl = await client.pttl(backoffKey);
        if (backoffTtl > 0) {
            rateLimitMetrics_js_1.rateLimitMetrics.blocked.inc({
                bucket: request.bucketType,
                source: 'redis',
                reason: 'backoff',
                endpoint: request.endpoint,
            });
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfterMs: backoffTtl,
                backoffMs: backoffTtl,
                bucketType: request.bucketType,
                source: 'redis',
            };
        }
        await client.zremrangebyscore(bucketKey, 0, windowStart);
        await client.zadd(bucketKey, now, memberId);
        await client.pexpire(bucketKey, this.config.windowMs);
        const count = await client.zcard(bucketKey);
        const remaining = Math.max(limit - count, 0);
        const utilization = count / limit;
        if (utilization >= this.config.alertThreshold) {
            exports.rateLimitAlerter.emit('saturation', {
                bucket: request.bucketType,
                identifier: request.identifier,
                utilization,
                endpoint: request.endpoint,
            });
        }
        if (count > limit) {
            await client.zrem(bucketKey, memberId);
            const violations = await client.incr(violationKey);
            await client.pexpire(violationKey, this.config.windowMs);
            const backoffMs = Math.min(this.config.baseBackoffMs * 2 ** Math.max(0, violations - 1), this.config.maxBackoffMs);
            await client.set(backoffKey, '1', 'PX', backoffMs);
            rateLimitMetrics_js_1.rateLimitMetrics.blocked.inc({
                bucket: request.bucketType,
                source: 'redis',
                reason: 'limit',
                endpoint: request.endpoint,
            });
            rateLimitMetrics_js_1.rateLimitMetrics.backoff.observe({ bucket: request.bucketType, endpoint: request.endpoint }, backoffMs);
            exports.rateLimitAlerter.emit('violation', {
                bucket: request.bucketType,
                identifier: request.identifier,
                endpoint: request.endpoint,
                limit,
                attempted: count,
                backoffMs,
            });
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfterMs: backoffMs,
                backoffMs,
                bucketType: request.bucketType,
                source: 'redis',
            };
        }
        rateLimitMetrics_js_1.rateLimitMetrics.allowed.inc({
            bucket: request.bucketType,
            source: 'redis',
            endpoint: request.endpoint,
        });
        return {
            allowed: true,
            remaining,
            limit,
            retryAfterMs: 0,
            backoffMs: 0,
            bucketType: request.bucketType,
            source: 'redis',
        };
    }
    async consumeInMemory(request) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const bucketKey = this.buildBucketKey(request);
        const limit = this.resolveLimit(request);
        const backoffKey = `${bucketKey}:backoff`;
        const backoffRemaining = this.memoryBackoffTtl(backoffKey, now);
        if (backoffRemaining > 0) {
            rateLimitMetrics_js_1.rateLimitMetrics.blocked.inc({
                bucket: request.bucketType,
                source: 'memory',
                reason: 'backoff',
                endpoint: request.endpoint,
            });
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfterMs: backoffRemaining,
                backoffMs: backoffRemaining,
                bucketType: request.bucketType,
                source: 'memory',
            };
        }
        const window = this.memoryWindows.get(bucketKey) || [];
        const filtered = window.filter((timestamp) => timestamp >= windowStart);
        filtered.push(now);
        this.memoryWindows.set(bucketKey, filtered);
        const count = filtered.length;
        const remaining = Math.max(limit - count, 0);
        if (count > limit) {
            filtered.pop();
            const violations = (this.memoryViolations.get(bucketKey) || 0) + 1;
            this.memoryViolations.set(bucketKey, violations);
            const backoffMs = Math.min(this.config.baseBackoffMs * 2 ** Math.max(0, violations - 1), this.config.maxBackoffMs);
            this.memoryWindows.set(`${backoffKey}:expires`, [now + backoffMs]);
            rateLimitMetrics_js_1.rateLimitMetrics.blocked.inc({
                bucket: request.bucketType,
                source: 'memory',
                reason: 'limit',
                endpoint: request.endpoint,
            });
            rateLimitMetrics_js_1.rateLimitMetrics.backoff.observe({ bucket: request.bucketType, endpoint: request.endpoint }, backoffMs);
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfterMs: backoffMs,
                backoffMs,
                bucketType: request.bucketType,
                source: 'memory',
            };
        }
        rateLimitMetrics_js_1.rateLimitMetrics.allowed.inc({
            bucket: request.bucketType,
            source: 'memory',
            endpoint: request.endpoint,
        });
        return {
            allowed: true,
            remaining,
            limit,
            retryAfterMs: 0,
            backoffMs: 0,
            bucketType: request.bucketType,
            source: 'memory',
        };
    }
    memoryBackoffTtl(key, now) {
        const [expires] = this.memoryWindows.get(`${key}:expires`) || [];
        if (!expires)
            return 0;
        const ttl = expires - now;
        return ttl > 0 ? ttl : 0;
    }
    buildBucketKey(request) {
        return `ratelimit:${request.bucketType}:${request.identifier}`;
    }
    resolveLimit(request) {
        if (request.bucketType === 'apiKey') {
            if (request.apiKey && this.config.apiKeyQuotas[request.apiKey]) {
                return this.config.apiKeyQuotas[request.apiKey];
            }
            return this.config.defaultApiKeyLimit;
        }
        if (request.bucketType === 'user') {
            return this.config.userLimit;
        }
        return this.config.ipLimit;
    }
}
exports.SlidingWindowRateLimiter = SlidingWindowRateLimiter;
const limiter = new SlidingWindowRateLimiter();
exports.rateLimiter = limiter;
exports.rateLimitAlerter.on('violation', (payload) => {
    logger_js_1.logger.warn({
        message: 'Rate limit violation',
        ...payload,
    });
});
exports.rateLimitAlerter.on('saturation', (payload) => {
    logger_js_1.logger.warn({
        message: 'Rate limit saturation warning',
        ...payload,
    });
});
function extractIdentity(req) {
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    const ip = forwardedFor.split(',')[0]?.trim() || req.ip;
    const apiKey = req.headers['x-api-key'] || undefined;
    const userId = req.user?.id || req.headers['x-user-id'];
    return { ip, apiKey, userId };
}
function rateLimitMiddleware(req, res, next) {
    const { ip, apiKey, userId } = extractIdentity(req);
    const bucketType = apiKey
        ? 'apiKey'
        : userId
            ? 'user'
            : 'ip';
    const identifier = apiKey || userId || ip || 'anonymous';
    const endpoint = req.path || 'unknown';
    limiter
        .consume({
        identifier,
        endpoint,
        bucketType,
        apiKey: apiKey || undefined,
        weight: 1,
    })
        .then((decision) => {
        res.setHeader('X-RateLimit-Limit', decision.limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(decision.remaining, 0));
        res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + decision.retryAfterMs) / 1000));
        if (decision.retryAfterMs > 0) {
            res.setHeader('Retry-After', Math.ceil(decision.retryAfterMs / 1000));
        }
        if (!decision.allowed) {
            res.status(429).json({
                error: 'rate_limited',
                bucket: decision.bucketType,
                retryAfterMs: decision.retryAfterMs,
                backoffMs: decision.backoffMs,
            });
            return;
        }
        next();
    })
        .catch((error) => {
        logger_js_1.logger.error({ error }, 'Unhandled rate limit middleware error');
        next();
    });
}
