"use strict";
/**
 * Sliding Window Rate Limiter Algorithm
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlidingWindowLimiter = void 0;
class SlidingWindowLimiter {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Check and consume a request using sliding window algorithm
     */
    async consume(key, max, windowMs) {
        // Increment request count and get current state
        const state = await this.store.increment(key, windowMs);
        // Calculate remaining and whether limit is exceeded
        const remaining = Math.max(0, max - state.consumed);
        const isExceeded = state.consumed > max;
        return {
            ...state,
            limit: max,
            remaining,
            isExceeded,
        };
    }
    /**
     * Get current state without consuming
     */
    async peek(key, max) {
        const state = await this.store.get(key);
        if (!state) {
            return null;
        }
        const remaining = Math.max(0, max - state.consumed);
        const isExceeded = state.consumed > max;
        return {
            ...state,
            limit: max,
            remaining,
            isExceeded,
        };
    }
    /**
     * Reset rate limit for a key
     */
    async reset(key) {
        await this.store.reset(key);
    }
}
exports.SlidingWindowLimiter = SlidingWindowLimiter;
