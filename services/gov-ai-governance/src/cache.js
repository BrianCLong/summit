"use strict";
/**
 * LRU Cache with TTL for performance optimization
 *
 * Provides efficient caching for consent lookups and model registrations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionCache = exports.modelCache = exports.consentCache = exports.LRUCache = void 0;
class LRUCache {
    cache;
    maxSize;
    defaultTtlMs;
    hits = 0;
    misses = 0;
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize ?? 1000;
        this.defaultTtlMs = options.defaultTtlMs ?? 300_000; // 5 minutes default
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        this.hits++;
        return entry.value;
    }
    set(key, value, ttlMs) {
        // Remove oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
        });
    }
    delete(key) {
        return this.cache.delete(key);
    }
    invalidatePattern(pattern) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (pattern(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
}
exports.LRUCache = LRUCache;
// Singleton caches for different data types
exports.consentCache = new LRUCache({
    maxSize: 10000,
    defaultTtlMs: 60_000, // 1 minute for consent (may change frequently)
});
exports.modelCache = new LRUCache({
    maxSize: 500,
    defaultTtlMs: 300_000, // 5 minutes for models (change less frequently)
});
exports.decisionCache = new LRUCache({
    maxSize: 5000,
    defaultTtlMs: 600_000, // 10 minutes for decisions (immutable once made)
});
