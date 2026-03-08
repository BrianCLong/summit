"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * Token bucket rate limiter for controlling job processing rates
 */
class RateLimiter {
    maxTokens;
    refillDuration;
    tokens;
    lastRefill;
    constructor(maxTokens, refillDuration) {
        this.maxTokens = maxTokens;
        this.refillDuration = refillDuration;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }
    /**
     * Try to acquire a token. Returns true if successful, false if rate limit exceeded.
     */
    tryAcquire() {
        this.refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    }
    /**
     * Wait until a token is available, then acquire it
     */
    async acquire() {
        while (!this.tryAcquire()) {
            await this.sleep(100); // Wait 100ms before retrying
        }
    }
    /**
     * Refill tokens based on elapsed time
     */
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        if (elapsed >= this.refillDuration) {
            const refillCount = Math.floor(elapsed / this.refillDuration);
            this.tokens = Math.min(this.maxTokens, this.tokens + refillCount * this.maxTokens);
            this.lastRefill = now;
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get current token count
     */
    getAvailableTokens() {
        this.refill();
        return this.tokens;
    }
    /**
     * Reset the rate limiter
     */
    reset() {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }
}
exports.RateLimiter = RateLimiter;
