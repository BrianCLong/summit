"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStats = exports.ProfileCache = void 0;
/**
 * In-memory LRU cache with TTL support for performance optimization.
 * Reduces database lookups for frequently accessed citizen profiles.
 */
class ProfileCache {
    cache = new Map();
    maxSize;
    ttlMs;
    constructor(options = {}) {
        this.maxSize = options.maxSize || 1000;
        this.ttlMs = (options.ttlSeconds || 300) * 1000; // Default 5 minutes
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        // Move to end for LRU
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value) {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs,
        });
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
    /**
     * Get or compute value if not cached
     */
    async getOrCompute(key, compute) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await compute();
        this.set(key, value);
        return value;
    }
}
exports.ProfileCache = ProfileCache;
/**
 * Cache statistics for monitoring
 */
class CacheStats {
    hits = 0;
    misses = 0;
    recordHit() {
        this.hits++;
    }
    recordMiss() {
        this.misses++;
    }
    getStats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
    reset() {
        this.hits = 0;
        this.misses = 0;
    }
}
exports.CacheStats = CacheStats;
