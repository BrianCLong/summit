"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryProvider = void 0;
const lru_cache_1 = require("lru-cache");
/**
 * In-memory LRU cache provider
 */
class MemoryProvider {
    name = 'memory';
    cache;
    constructor(options = {}) {
        this.cache = new lru_cache_1.LRUCache({
            max: options.maxSize ?? 1000,
            ttl: options.ttl ?? 60000,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        });
    }
    async isAvailable() {
        return true;
    }
    async get(key) {
        const value = this.cache.get(key);
        if (value === undefined) {
            return null;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl) {
        const serialized = JSON.stringify(value);
        if (ttl !== undefined) {
            this.cache.set(key, serialized, { ttl: ttl * 1000 });
        }
        else {
            this.cache.set(key, serialized);
        }
    }
    async delete(key) {
        return this.cache.delete(key);
    }
    async exists(key) {
        return this.cache.has(key);
    }
    async deletePattern(pattern) {
        // Convert glob pattern to regex
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
    async mget(keys) {
        return Promise.all(keys.map(key => this.get(key)));
    }
    async mset(entries) {
        for (const entry of entries) {
            await this.set(entry.key, entry.value, entry.ttl);
        }
    }
    async ttl(key) {
        const remaining = this.cache.getRemainingTTL(key);
        return remaining > 0 ? Math.floor(remaining / 1000) : -1;
    }
    /** Backup memory cache */
    async backup() {
        const backupData = {};
        for (const [key, value] of this.cache.entries()) {
            const remainingTTL = this.cache.getRemainingTTL(key);
            try {
                backupData[key] = {
                    value: JSON.parse(value),
                    ttl: remainingTTL > 0 ? Math.floor(remainingTTL / 1000) : -1
                };
            }
            catch {
                // Fallback for non-JSON
                backupData[key] = {
                    value,
                    ttl: remainingTTL > 0 ? Math.floor(remainingTTL / 1000) : -1
                };
            }
        }
        return JSON.stringify(backupData);
    }
    /** Restore memory cache */
    async restore(backupStr) {
        try {
            const backupData = JSON.parse(backupStr);
            this.cache.clear();
            for (const [key, data] of Object.entries(backupData)) {
                if (data.ttl > 0) {
                    this.cache.set(key, JSON.stringify(data.value), { ttl: data.ttl * 1000 });
                }
                else {
                    this.cache.set(key, JSON.stringify(data.value));
                }
            }
        }
        catch (error) {
            console.error('Failed to restore Memory backup:', error);
            throw error;
        }
    }
    async close() {
        this.cache.clear();
    }
    /**
     * Get cache size
     */
    get size() {
        return this.cache.size;
    }
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
    }
}
exports.MemoryProvider = MemoryProvider;
