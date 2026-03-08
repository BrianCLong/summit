"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    limit;
    windowMs;
    now;
    buckets = new Map();
    constructor(options) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.now = options.now ?? Date.now;
    }
    check(key) {
        const current = this.now();
        const bucket = this.buckets.get(key);
        if (!bucket || bucket.reset <= current) {
            const fresh = {
                remaining: this.limit,
                reset: current + this.windowMs,
            };
            this.buckets.set(key, fresh);
            fresh.remaining -= 1;
            return {
                allowed: true,
                remaining: fresh.remaining,
                reset: fresh.reset,
                limit: this.limit,
            };
        }
        if (bucket.remaining <= 0) {
            return {
                allowed: false,
                remaining: 0,
                reset: bucket.reset,
                limit: this.limit,
            };
        }
        bucket.remaining -= 1;
        return {
            allowed: true,
            remaining: bucket.remaining,
            reset: bucket.reset,
            limit: this.limit,
        };
    }
}
exports.RateLimiter = RateLimiter;
