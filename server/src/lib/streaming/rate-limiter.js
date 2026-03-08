"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveRateLimiter = void 0;
class AdaptiveRateLimiter {
    globalTokens;
    maxTokens;
    initialTokens;
    refillRate; // Can now be modified
    initialRefillRate;
    globalLastRefill;
    clientTokens = new Map();
    clientScope;
    metricsClient;
    adaptiveConfig;
    requestQueue = [];
    queueProcessorInterval;
    cleanupInterval;
    constructor(options = {}) {
        this.maxTokens = options.maxTokens ?? options.initialTokens ?? 100;
        this.initialTokens = options.initialTokens ?? this.maxTokens;
        this.globalTokens = this.initialTokens;
        this.refillRate = options.refillRate ?? 10;
        this.initialRefillRate = this.refillRate;
        this.globalLastRefill = Date.now();
        this.clientScope = options.clientScope ?? false;
        this.metricsClient = options.metricsClient;
        this.adaptiveConfig = options.adaptive;
        this.queueProcessorInterval = setInterval(() => this.processQueue(), 100);
        // Cleanup stale client token buckets every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const staleThreshold = 5 * 60 * 1000;
            for (const [key, bucket] of this.clientTokens.entries()) {
                if (now - bucket.lastRefill > staleThreshold) {
                    this.clientTokens.delete(key);
                }
            }
        }, 5 * 60 * 1000);
    }
    refill(id) {
        const now = Date.now();
        if (this.clientScope && id) {
            const bucket = this.clientTokens.get(id) ?? { tokens: this.initialTokens, lastRefill: now };
            const elapsedTime = (now - bucket.lastRefill) / 1000;
            const tokensToAdd = elapsedTime * this.refillRate;
            bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
            this.clientTokens.set(id, bucket);
        }
        else {
            const elapsedTime = (now - this.globalLastRefill) / 1000;
            const tokensToAdd = elapsedTime * this.refillRate;
            this.globalTokens = Math.min(this.maxTokens, this.globalTokens + tokensToAdd);
            this.globalLastRefill = now;
        }
    }
    async acquire(id) {
        return new Promise((resolve) => {
            if (this.tryAcquire(id)) {
                resolve();
            }
            else {
                this.requestQueue.push({ id, resolve });
                this.metricsClient?.increment('rate_limiter.queued', { client: id ?? 'global' });
            }
        });
    }
    tryAcquire(id) {
        this.refill(id);
        let hasToken = false;
        if (this.clientScope && id) {
            const bucket = this.clientTokens.get(id);
            if (bucket && bucket.tokens >= 1) {
                bucket.tokens--;
                hasToken = true;
            }
        }
        else {
            if (this.globalTokens >= 1) {
                this.globalTokens--;
                hasToken = true;
            }
        }
        if (hasToken) {
            this.metricsClient?.increment('rate_limiter.acquired', { client: id ?? 'global' });
            return true;
        }
        else {
            this.metricsClient?.increment('rate_limiter.rejected', { client: id ?? 'global' });
            return false;
        }
    }
    tryAcquireSync(id) {
        return this.tryAcquire(id);
    }
    processQueue() {
        if (this.requestQueue.length === 0) {
            return;
        }
        const { id, resolve } = this.requestQueue[0];
        if (this.tryAcquire(id)) {
            this.requestQueue.shift();
            resolve();
        }
        this.adapt();
    }
    adapt() {
        if (!this.adaptiveConfig)
            return;
        if (this.requestQueue.length > this.adaptiveConfig.queueThreshold) {
            this.refillRate = Math.max(1, this.refillRate * this.adaptiveConfig.refillRateAdjustment);
        }
        else {
            // Gradually return to the initial rate.
            // The formula `2 - adjustment` provides a gradual increase.
            // E.g., if adjustment is 0.9, this becomes 1.1, increasing the rate by 10%.
            this.refillRate = Math.min(this.initialRefillRate, this.refillRate * (2 - this.adaptiveConfig.refillRateAdjustment));
        }
        this.metricsClient?.gauge('rate_limiter.refill_rate', this.refillRate);
    }
    destroy() {
        clearInterval(this.queueProcessorInterval);
        clearInterval(this.cleanupInterval);
    }
}
exports.AdaptiveRateLimiter = AdaptiveRateLimiter;
