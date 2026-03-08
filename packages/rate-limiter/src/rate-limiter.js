"use strict";
/**
 * Core Rate Limiter
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const pino_1 = __importDefault(require("pino"));
const redis_store_js_1 = require("./store/redis-store.js");
const sliding_window_js_1 = require("./algorithms/sliding-window.js");
const token_bucket_js_1 = require("./algorithms/token-bucket.js");
const config_js_1 = require("./config.js");
const logger = (0, pino_1.default)();
class RateLimiter {
    store;
    slidingWindow;
    tokenBucket;
    config;
    keyPrefix;
    constructor(redisClient, config = {}) {
        this.config = { ...config_js_1.DEFAULT_CONFIG, ...config };
        this.keyPrefix = this.config.global.keyPrefix;
        this.store = new redis_store_js_1.RedisRateLimitStore(redisClient, this.keyPrefix);
        this.slidingWindow = new sliding_window_js_1.SlidingWindowLimiter(this.store);
        this.tokenBucket = new token_bucket_js_1.TokenBucketLimiter(this.store);
    }
    /**
     * Check if request should be rate limited
     */
    async check(identifier, endpoint, tier) {
        if (!this.config.global.enabled) {
            // Rate limiting disabled, allow all requests
            return {
                key: identifier,
                consumed: 0,
                limit: Infinity,
                remaining: Infinity,
                resetAt: 0,
                retryAfter: 0,
                isExceeded: false,
            };
        }
        try {
            // Get policy for this endpoint and tier
            const policy = (0, config_js_1.getPolicyForEndpoint)(endpoint, tier, this.config);
            if (!policy.enabled) {
                return {
                    key: identifier,
                    consumed: 0,
                    limit: Infinity,
                    remaining: Infinity,
                    resetAt: 0,
                    retryAfter: 0,
                    isExceeded: false,
                };
            }
            // Generate rate limit key
            const key = this.generateKey(identifier, endpoint, tier);
            // Apply rate limiting based on algorithm
            let state;
            switch (policy.algorithm) {
                case 'sliding-window':
                    state = await this.slidingWindow.consume(key, policy.max, policy.windowMs);
                    break;
                case 'token-bucket':
                    state = await this.tokenBucket.consume(key, policy.capacity || policy.max, policy.refillRate || policy.max / (policy.windowMs / 1000));
                    break;
                case 'fixed-window':
                    // Fixed window is similar to sliding window but with fixed reset times
                    state = await this.slidingWindow.consume(key, policy.max, policy.windowMs);
                    break;
                default:
                    throw new Error(`Unknown algorithm: ${policy.algorithm}`);
            }
            // Log violation if threshold exceeded
            if (state.isExceeded) {
                logger.warn({
                    message: 'Rate limit exceeded',
                    identifier,
                    endpoint,
                    tier,
                    consumed: state.consumed,
                    limit: state.limit,
                });
            }
            return state;
        }
        catch (error) {
            logger.error({
                message: 'Rate limit check failed',
                identifier,
                endpoint,
                tier,
                error: error instanceof Error ? error.message : String(error),
            });
            // Fail open - allow request if rate limiting fails
            return {
                key: identifier,
                consumed: 0,
                limit: Infinity,
                remaining: Infinity,
                resetAt: 0,
                retryAfter: 0,
                isExceeded: false,
            };
        }
    }
    /**
     * Peek at current state without consuming
     */
    async peek(identifier, endpoint, tier) {
        const policy = (0, config_js_1.getPolicyForEndpoint)(endpoint, tier, this.config);
        const key = this.generateKey(identifier, endpoint, tier);
        switch (policy.algorithm) {
            case 'sliding-window':
            case 'fixed-window':
                return this.slidingWindow.peek(key, policy.max);
            case 'token-bucket':
                return this.tokenBucket.peek(key, policy.capacity || policy.max, policy.refillRate || policy.max / (policy.windowMs / 1000));
            default:
                return null;
        }
    }
    /**
     * Reset rate limit for an identifier
     */
    async reset(identifier, endpoint, tier) {
        const key = this.generateKey(identifier, endpoint, tier);
        const policy = (0, config_js_1.getPolicyForEndpoint)(endpoint, tier, this.config);
        switch (policy.algorithm) {
            case 'sliding-window':
            case 'fixed-window':
                await this.slidingWindow.reset(key);
                break;
            case 'token-bucket':
                await this.tokenBucket.reset(key);
                break;
        }
    }
    /**
     * Generate unique key for rate limiting
     */
    generateKey(identifier, endpoint, tier) {
        const parts = [identifier, endpoint];
        if (tier) {
            parts.push(tier);
        }
        return parts.join(':');
    }
    /**
     * Get policy for endpoint and tier
     */
    getPolicy(endpoint, tier) {
        return (0, config_js_1.getPolicyForEndpoint)(endpoint, tier, this.config);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Health check
     */
    async healthCheck() {
        return this.store.healthCheck();
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Create rate limiter instance
 */
function createRateLimiter(redisClient, config) {
    return new RateLimiter(redisClient, config);
}
