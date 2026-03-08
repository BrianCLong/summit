"use strict";
/**
 * Fixed Window Strategy
 *
 * Counts requests within fixed time windows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedWindowLimiter = void 0;
const rate_limiter_js_1 = require("../rate-limiter.js");
class FixedWindowLimiter extends rate_limiter_js_1.RateLimiter {
    windows = new Map();
    constructor(config) {
        super(config);
    }
    async checkLimit(key) {
        const fullKey = this.getKey(key);
        const now = Date.now();
        const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
        const windowEnd = windowStart + this.config.windowMs;
        let window = this.windows.get(fullKey);
        // Create new window if needed
        if (!window || window.windowStart !== windowStart) {
            window = {
                windowStart,
                windowEnd,
                count: 0,
            };
            this.windows.set(fullKey, window);
        }
        // Increment counter
        window.count++;
        const allowed = window.count <= this.config.maxRequests;
        const result = {
            allowed,
            info: {
                limit: this.config.maxRequests,
                current: window.count,
                remaining: Math.max(0, this.config.maxRequests - window.count),
                resetTime: windowEnd,
            },
            retryAfter: allowed ? undefined : Math.ceil((windowEnd - now) / 1000),
        };
        this.logRateLimit(key, result);
        return result;
    }
    async resetLimit(key) {
        const fullKey = this.getKey(key);
        this.windows.delete(fullKey);
    }
    // Cleanup expired windows
    cleanup() {
        const now = Date.now();
        for (const [key, window] of this.windows.entries()) {
            if (now > window.windowEnd) {
                this.windows.delete(key);
            }
        }
    }
}
exports.FixedWindowLimiter = FixedWindowLimiter;
