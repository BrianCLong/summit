"use strict";
/**
 * Leaky Bucket Strategy
 *
 * Processes requests at a constant rate, smoothing bursts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeakyBucketLimiter = void 0;
const rate_limiter_js_1 = require("../rate-limiter.js");
class LeakyBucketLimiter extends rate_limiter_js_1.RateLimiter {
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
                water: 0,
                lastLeak: now,
            };
            this.buckets.set(fullKey, bucket);
        }
        // Leak water based on time elapsed
        const timeSinceLeak = (now - bucket.lastLeak) / 1000;
        const waterToLeak = timeSinceLeak * this.bucketConfig.leakRate;
        bucket.water = Math.max(0, bucket.water - waterToLeak);
        bucket.lastLeak = now;
        // Try to add water
        const allowed = bucket.water < this.bucketConfig.capacity;
        if (allowed) {
            bucket.water += 1;
        }
        const resetTime = now + ((bucket.water / this.bucketConfig.leakRate) * 1000);
        const result = {
            allowed,
            info: {
                limit: this.bucketConfig.capacity,
                current: Math.ceil(bucket.water),
                remaining: Math.max(0, Math.floor(this.bucketConfig.capacity - bucket.water)),
                resetTime,
            },
            retryAfter: allowed ? undefined : Math.ceil((bucket.water - this.bucketConfig.capacity + 1) / this.bucketConfig.leakRate),
        };
        this.logRateLimit(key, result);
        return result;
    }
    async resetLimit(key) {
        const fullKey = this.getKey(key);
        this.buckets.delete(fullKey);
    }
}
exports.LeakyBucketLimiter = LeakyBucketLimiter;
