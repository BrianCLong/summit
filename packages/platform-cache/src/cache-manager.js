"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
exports.createCacheManager = createCacheManager;
exports.getDefaultCacheManager = getDefaultCacheManager;
const types_js_1 = require("./types.js");
const cache_client_js_1 = require("./cache-client.js");
const memory_js_1 = require("./providers/memory.js");
const redis_js_1 = require("./providers/redis.js");
/**
 * Default metrics implementation
 */
class DefaultMetrics {
    hits = 0;
    misses = 0;
    localHits = 0;
    redisHits = 0;
    getLatencies = [];
    setLatencies = [];
    recordHit(source) {
        this.hits++;
        if (source === 'local') {
            this.localHits++;
        }
        else {
            this.redisHits++;
        }
    }
    recordMiss() {
        this.misses++;
    }
    recordGetLatency(ms) {
        this.getLatencies.push(ms);
        if (this.getLatencies.length > 1000) {
            this.getLatencies.shift();
        }
    }
    recordSetLatency(ms) {
        this.setLatencies.push(ms);
        if (this.setLatencies.length > 1000) {
            this.setLatencies.shift();
        }
    }
    getStats() {
        const total = this.hits + this.misses;
        const avgGet = this.getLatencies.length > 0
            ? this.getLatencies.reduce((a, b) => a + b, 0) / this.getLatencies.length
            : 0;
        const avgSet = this.setLatencies.length > 0
            ? this.setLatencies.reduce((a, b) => a + b, 0) / this.setLatencies.length
            : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total) * 100 : 0,
            localHits: this.localHits,
            redisHits: this.redisHits,
            localSize: 0, // Updated by provider
            redisKeys: 0, // Updated by provider
            avgGetLatency: avgGet,
            avgSetLatency: avgSet,
        };
    }
    reset() {
        this.hits = 0;
        this.misses = 0;
        this.localHits = 0;
        this.redisHits = 0;
        this.getLatencies = [];
        this.setLatencies = [];
    }
}
/**
 * Cache manager for creating and managing cache clients
 */
class CacheManager {
    config;
    client = null;
    metrics;
    constructor(config = {}) {
        this.config = types_js_1.CacheConfigSchema.parse(config);
        this.metrics = new DefaultMetrics();
    }
    /**
     * Get or create cache client
     */
    async getClient() {
        if (this.client) {
            return this.client;
        }
        let localProvider = null;
        let redisProvider = null;
        // Initialize local cache
        if (this.config.local.enabled) {
            localProvider = new memory_js_1.MemoryProvider({
                maxSize: this.config.local.maxSize,
                ttl: this.config.local.ttl * 1000,
            });
        }
        // Initialize Redis
        if (this.config.redis.enabled) {
            redisProvider = new redis_js_1.RedisProvider({
                url: this.config.redis.url,
                host: this.config.redis.host,
                port: this.config.redis.port,
                password: this.config.redis.password,
                db: this.config.redis.db,
                keyPrefix: this.config.redis.keyPrefix,
                maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
                nodes: this.config.redis.nodes,
                partitionStrategy: this.config.redis.partitionStrategy,
            });
            // Check Redis availability
            const available = await redisProvider.isAvailable();
            if (!available) {
                console.warn('Redis not available, falling back to local cache only');
                redisProvider = null;
            }
        }
        this.client = new cache_client_js_1.CacheClient(this.config, localProvider, redisProvider, this.metrics);
        return this.client;
    }
    /**
     * Get statistics
     */
    getStats() {
        return this.metrics.getStats();
    }
    /**
     * Close all connections
     */
    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }
    /**
     * Create a memoized function
     */
    memoize(fn, options) {
        const { keyPrefix, ttl, keyGenerator } = options;
        return async (...args) => {
            const client = await this.getClient();
            const key = keyGenerator
                ? `${keyPrefix}:${keyGenerator(...args)}`
                : `${keyPrefix}:${JSON.stringify(args)}`;
            const entry = await client.getOrSet(key, () => fn(...args), { ttl });
            return entry.value;
        };
    }
}
exports.CacheManager = CacheManager;
/**
 * Create a new cache manager
 */
function createCacheManager(config) {
    return new CacheManager(config);
}
// Default singleton instance
let defaultManager = null;
/**
 * Get default cache manager
 */
function getDefaultCacheManager() {
    if (!defaultManager) {
        defaultManager = createCacheManager();
    }
    return defaultManager;
}
