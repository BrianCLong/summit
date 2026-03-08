"use strict";
/**
 * Token Bucket Strategy
 *
 * Allows burst traffic while maintaining average rate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBucketLimiter = void 0;
const rate_limiter_js_1 = require("../rate-limiter.js");
class TokenBucketLimiter extends rate_limiter_js_1.RateLimiter {
    buckets = new Map();
    bucketConfig;
    constructor(config) {
        super(config);
        this.bucketConfig = config;
    }
    async checkLimit(key) {
        const fullKey = this.getKey(key);
        const now = Date.now();
        let bucket = this.buckets.get(fullKey);
        if (!bucket) {
            bucket = {
                tokens: this.bucketConfig.bucketSize,
                lastRefill: now,
            };
            this.buckets.set(fullKey, bucket);
        }
        // Refill tokens based on time elapsed
        const timeSinceRefill = (now - bucket.lastRefill) / 1000;
        const tokensToAdd = timeSinceRefill * this.bucketConfig.refillRate;
        bucket.tokens = Math.min(this.bucketConfig.bucketSize, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
        // Try to consume a token
        const allowed = bucket.tokens >= 1;
        if (allowed) {
            bucket.tokens -= 1;
        }
        const resetTime = now + ((1 - bucket.tokens % 1) / this.bucketConfig.refillRate) * 1000;
        const result = {
            allowed,
            info: {
                limit: this.bucketConfig.bucketSize,
                current: this.bucketConfig.bucketSize - Math.floor(bucket.tokens),
                remaining: Math.floor(bucket.tokens),
                resetTime,
            },
            retryAfter: allowed ? undefined : Math.ceil((1 / this.bucketConfig.refillRate)),
        };
        this.logRateLimit(key, result);
        return result;
    }
    async resetLimit(key) {
        const fullKey = this.getKey(key);
        this.buckets.delete(fullKey);
    }
}
exports.TokenBucketLimiter = TokenBucketLimiter;
