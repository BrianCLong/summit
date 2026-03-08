"use strict";
/**
 * In-Memory Cache Utility
 *
 * Provides TTL-based caching with LRU eviction for the threat library service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatLibraryCache = void 0;
exports.createCacheKey = createCacheKey;
exports.memoize = memoize;
/**
 * LRU Cache with TTL support
 */
class ThreatLibraryCache {
    cache = new Map();
    maxSize;
    defaultTtlMs;
    hits = 0;
    misses = 0;
    evictions = 0;
    constructor(options) {
        this.maxSize = options.maxSize;
        this.defaultTtlMs = options.defaultTtlMs;
    }
    /**
     * Get a value from the cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }
        // Update access time for LRU
        entry.accessedAt = Date.now();
        this.hits++;
        return entry.value;
    }
    /**
     * Set a value in the cache
     */
    set(key, value, ttlMs) {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
        this.cache.set(key, {
            value,
            expiresAt,
            accessedAt: Date.now(),
        });
    }
    /**
     * Check if a key exists and is not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Delete a key from the cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all entries from the cache
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        this.cleanExpired();
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
        };
    }
    /**
     * Get all keys in the cache (non-expired)
     */
    keys() {
        this.cleanExpired();
        return Array.from(this.cache.keys());
    }
    /**
     * Get all values in the cache (non-expired)
     */
    values() {
        this.cleanExpired();
        return Array.from(this.cache.values()).map((entry) => entry.value);
    }
    /**
     * Evict the least recently used entry
     */
    evictLRU() {
        let oldestKey;
        let oldestAccessedAt = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.accessedAt < oldestAccessedAt) {
                oldestAccessedAt = entry.accessedAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.evictions++;
        }
    }
    /**
     * Clean expired entries
     */
    cleanExpired() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
exports.ThreatLibraryCache = ThreatLibraryCache;
/**
 * Create a cache key from multiple parts
 */
function createCacheKey(...parts) {
    return parts.filter((p) => p !== undefined).join(':');
}
/**
 * Memoization decorator for async functions
 */
function memoize(fn, cache, keyFn, ttlMs) {
    return (async (...args) => {
        const key = keyFn(...args);
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const result = await fn(...args);
        cache.set(key, result, ttlMs);
        return result;
    });
}
