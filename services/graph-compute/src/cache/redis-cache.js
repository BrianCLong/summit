"use strict";
/**
 * Redis Cache for Graph Analytics Results
 *
 * Caches expensive computation results with configurable TTL
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphAnalyticsCache = void 0;
const crypto_1 = require("crypto");
class GraphAnalyticsCache {
    redisClient;
    config;
    constructor(redisClient, // RedisClientType from redis package
    config = {}) {
        this.redisClient = redisClient;
        this.config = {
            defaultTTL: config.defaultTTL ?? 3600, // 1 hour
            keyPrefix: config.keyPrefix ?? 'graph-analytics:',
        };
    }
    /**
     * Generates cache key from task parameters
     */
    generateKey(taskType, graphHash, options = {}) {
        const optionsStr = JSON.stringify(options, Object.keys(options).sort());
        const hash = (0, crypto_1.createHash)('sha256')
            .update(`${taskType}:${graphHash}:${optionsStr}`)
            .digest('hex')
            .substring(0, 16);
        return `${this.config.keyPrefix}${taskType}:${hash}`;
    }
    /**
     * Hashes graph structure for cache key
     */
    hashGraph(graph) {
        const nodeStr = graph.nodes.sort().join(',');
        const edgeStr = graph.edges
            .map((e) => `${e.source}-${e.target}`)
            .sort()
            .join(',');
        return (0, crypto_1.createHash)('sha256')
            .update(`${nodeStr}|${edgeStr}`)
            .digest('hex')
            .substring(0, 16);
    }
    /**
     * Gets cached result if available
     */
    async get(taskType, graph, options) {
        try {
            const graphHash = this.hashGraph(graph);
            const key = this.generateKey(taskType, graphHash, options);
            const cached = await this.redisClient.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    /**
     * Stores result in cache
     */
    async set(taskType, graph, result, options, ttl) {
        try {
            const graphHash = this.hashGraph(graph);
            const key = this.generateKey(taskType, graphHash, options);
            const cacheTTL = ttl ?? this.config.defaultTTL;
            await this.redisClient.setEx(key, cacheTTL, JSON.stringify(result));
        }
        catch (error) {
            console.error('Cache set error:', error);
        }
    }
    /**
     * Invalidates cache for a specific graph
     */
    async invalidate(taskType, graph) {
        try {
            const graphHash = this.hashGraph(graph);
            const pattern = `${this.config.keyPrefix}${taskType}:${graphHash}*`;
            // Scan and delete matching keys
            const keys = [];
            let cursor = 0;
            do {
                const result = await this.redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });
                cursor = result.cursor;
                keys.push(...result.keys);
            } while (cursor !== 0);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
            }
        }
        catch (error) {
            console.error('Cache invalidate error:', error);
        }
    }
    /**
     * Clears all cached analytics
     */
    async clear() {
        try {
            const pattern = `${this.config.keyPrefix}*`;
            const keys = [];
            let cursor = 0;
            do {
                const result = await this.redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });
                cursor = result.cursor;
                keys.push(...result.keys);
            } while (cursor !== 0);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
            }
        }
        catch (error) {
            console.error('Cache clear error:', error);
        }
    }
    /**
     * Gets cache statistics
     */
    async getStats() {
        try {
            const pattern = `${this.config.keyPrefix}*`;
            let totalKeys = 0;
            let cursor = 0;
            do {
                const result = await this.redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });
                cursor = result.cursor;
                totalKeys += result.keys.length;
            } while (cursor !== 0);
            const info = await this.redisClient.info('memory');
            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
            return {
                totalKeys,
                memoryUsage,
            };
        }
        catch (error) {
            console.error('Cache stats error:', error);
            return { totalKeys: 0, memoryUsage: 'unknown' };
        }
    }
}
exports.GraphAnalyticsCache = GraphAnalyticsCache;
