"use strict";
/**
 * Rate Limiter - Controls request rates for respectful crawling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
class RateLimiter {
    limiters = new Map();
    /**
     * Create a rate limiter for a specific source
     */
    createLimiter(source, points, duration) {
        const limiter = new rate_limiter_flexible_1.RateLimiterMemory({
            points, // Number of requests
            duration, // Per duration in seconds
            blockDuration: 0 // Do not block, just delay
        });
        this.limiters.set(source, limiter);
    }
    /**
     * Consume a point from the rate limiter
     */
    async consume(source, points = 1) {
        const limiter = this.limiters.get(source);
        if (!limiter) {
            throw new Error(`No rate limiter configured for source: ${source}`);
        }
        try {
            await limiter.consume(source, points);
        }
        catch (rejRes) {
            // Wait for the required time
            const delay = rejRes.msBeforeNext || 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            // Retry
            await limiter.consume(source, points);
        }
    }
    /**
     * Get rate limiter status
     */
    async getStatus(source) {
        const limiter = this.limiters.get(source);
        if (!limiter) {
            return null;
        }
        const res = await limiter.get(source);
        if (!res) {
            return { remainingPoints: 0, consumedPoints: 0 };
        }
        return {
            remainingPoints: res.remainingPoints,
            consumedPoints: res.consumedPoints
        };
    }
    /**
     * Reset rate limiter for a source
     */
    async reset(source) {
        const limiter = this.limiters.get(source);
        if (limiter) {
            await limiter.delete(source);
        }
    }
    /**
     * Remove rate limiter
     */
    removeLimiter(source) {
        this.limiters.delete(source);
    }
    /**
     * Clear all rate limiters
     */
    clear() {
        this.limiters.clear();
    }
}
exports.RateLimiter = RateLimiter;
