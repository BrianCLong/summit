"use strict";
/**
 * LRU Cache for performance optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCache = exports.nluCache = exports.translationCache = exports.LRUCache = void 0;
class LRUCache {
    cache;
    maxSize;
    defaultTTL;
    hits = 0;
    misses = 0;
    constructor(maxSize = 1000, defaultTTLMs = 3600000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTLMs;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }
        // Update access metadata
        entry.accessCount++;
        entry.lastAccess = Date.now();
        this.hits++;
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value, ttlMs) {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttlMs ?? this.defaultTTL),
            accessCount: 1,
            lastAccess: Date.now(),
        });
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    get size() {
        return this.cache.size;
    }
    getStats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
            size: this.cache.size,
        };
    }
    evictLRU() {
        // Remove least recently used entry
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.cache.delete(firstKey);
        }
    }
    // Periodic cleanup of expired entries
    cleanup() {
        let cleaned = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now > entry.expires) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        return cleaned;
    }
}
exports.LRUCache = LRUCache;
// Singleton caches for different purposes
exports.translationCache = new LRUCache(5000, 3600000); // 1 hour
exports.nluCache = new LRUCache(2000, 1800000); // 30 min
exports.sessionCache = new LRUCache(1000, 7200000); // 2 hours
