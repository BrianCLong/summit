"use strict";
/**
 * Sliding Window Strategy
 *
 * More accurate than fixed window, considers requests in a rolling time period
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlidingWindowLimiter = void 0;
const rate_limiter_js_1 = require("../rate-limiter.js");
class SlidingWindowLimiter extends rate_limiter_js_1.RateLimiter {
    requests = new Map();
    constructor(config) {
        super(config);
    }
    async checkLimit(key) {
        const fullKey = this.getKey(key);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        // Get or create request timestamps
        let timestamps = this.requests.get(fullKey) || [];
        // Remove old timestamps outside the window
        timestamps = timestamps.filter(ts => ts > windowStart);
        // Add current timestamp
        timestamps.push(now);
        // Update stored timestamps
        this.requests.set(fullKey, timestamps);
        const allowed = timestamps.length <= this.config.maxRequests;
        const result = {
            allowed,
            info: {
                limit: this.config.maxRequests,
                current: timestamps.length,
                remaining: Math.max(0, this.config.maxRequests - timestamps.length),
                resetTime: timestamps[0] + this.config.windowMs,
            },
            retryAfter: allowed ? undefined : Math.ceil((timestamps[0] + this.config.windowMs - now) / 1000),
        };
        this.logRateLimit(key, result);
        return result;
    }
    async resetLimit(key) {
        const fullKey = this.getKey(key);
        this.requests.delete(fullKey);
    }
    // Cleanup old requests
    cleanup() {
        const now = Date.now();
        for (const [key, timestamps] of this.requests.entries()) {
            const filtered = timestamps.filter(ts => ts > now - this.config.windowMs);
            if (filtered.length === 0) {
                this.requests.delete(key);
            }
            else {
                this.requests.set(key, filtered);
            }
        }
    }
}
exports.SlidingWindowLimiter = SlidingWindowLimiter;
