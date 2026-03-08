"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaManager = void 0;
class QuotaManager {
    limit;
    windowMs;
    now;
    buckets = new Map();
    constructor(options) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.now = options.now ?? Date.now;
    }
    consume(key) {
        const current = this.now();
        const bucket = this.buckets.get(key);
        if (!bucket || bucket.reset <= current) {
            const fresh = { used: 0, reset: current + this.windowMs };
            this.buckets.set(key, fresh);
            fresh.used += 1;
            return {
                allowed: true,
                remaining: this.limit - fresh.used,
                reset: fresh.reset,
                limit: this.limit,
            };
        }
        if (bucket.used >= this.limit) {
            return {
                allowed: false,
                remaining: 0,
                reset: bucket.reset,
                limit: this.limit,
            };
        }
        bucket.used += 1;
        return {
            allowed: true,
            remaining: this.limit - bucket.used,
            reset: bucket.reset,
            limit: this.limit,
        };
    }
}
exports.QuotaManager = QuotaManager;
