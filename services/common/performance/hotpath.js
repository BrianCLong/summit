"use strict";
/**
 * Hot-Path Optimization Framework
 * Sprint 27E: Performance-critical path optimization with caching and pooling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.HotPathOptimizer = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const perf_hooks_1 = require("perf_hooks");
class HotPathOptimizer {
    cacheConfig;
    poolConfig;
    redis;
    localCache = new Map();
    connectionPool = new Map();
    metrics = {
        executionTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        poolUtilization: 0,
        memoryUsage: 0,
    };
    constructor(redisUrl, cacheConfig, poolConfig) {
        this.cacheConfig = cacheConfig;
        this.poolConfig = poolConfig;
        this.redis = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableOfflineQueue: false,
            lazyConnect: true,
        });
    }
    /**
     * Execute function with hot-path optimizations
     */
    async withOptimization(key, fn, options) {
        const startTime = perf_hooks_1.performance.now();
        try {
            // Check local cache first
            if (!options?.skipCache) {
                const cached = await this.getFromCache(key);
                if (cached !== null) {
                    this.metrics.cacheHits++;
                    return cached;
                }
                this.metrics.cacheMisses++;
            }
            // Execute with connection pooling
            const result = await this.executeWithPooling(fn);
            // Cache result
            if (!options?.skipCache) {
                await this.setCache(key, result, options?.cacheTtl);
            }
            // Prefetch related data if configured
            if (options?.prefetch) {
                this.schedulePrefetch(key, fn);
            }
            return result;
        }
        finally {
            this.metrics.executionTime = perf_hooks_1.performance.now() - startTime;
            this.updateMetrics();
        }
    }
    /**
     * Batch operations for improved throughput
     */
    async batchExecute(operations) {
        const startTime = perf_hooks_1.performance.now();
        // Check cache for all keys in parallel
        const cachePromises = operations.map((op) => this.getFromCache(op.key).then((cached) => ({ key: op.key, cached })));
        const cacheResults = await Promise.all(cachePromises);
        // Identify cache misses
        const misses = operations.filter((op, i) => cacheResults[i].cached === null);
        // Execute misses in parallel with pooling
        const missPromises = misses.map(async (op) => {
            const result = await this.executeWithPooling(op.fn);
            await this.setCache(op.key, result, op.options?.cacheTtl);
            return { key: op.key, result };
        });
        const missResults = await Promise.all(missPromises);
        const missMap = new Map(missResults.map((r) => [r.key, r.result]));
        // Combine cached and computed results
        const results = operations.map((op, i) => {
            const cached = cacheResults[i].cached;
            return cached !== null ? cached : missMap.get(op.key);
        });
        this.metrics.executionTime = perf_hooks_1.performance.now() - startTime;
        return results;
    }
    /**
     * Query optimization with prepared statements
     */
    async optimizedQuery(queryKey, query, params, connection) {
        // Use prepared statements for hot queries
        const preparedKey = `prepared:${queryKey}`;
        let prepared = this.localCache.get(preparedKey)?.value;
        if (!prepared) {
            prepared = await connection.prepare(query);
            this.setLocalCache(preparedKey, prepared, 3600); // 1 hour
        }
        // Execute with parameter binding
        const result = await prepared.execute(params);
        return result.rows;
    }
    /**
     * Memory-efficient streaming for large datasets
     */
    async *streamOptimized(query, params, connection, batchSize = 1000) {
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
            const batchQuery = `${query} LIMIT ${batchSize} OFFSET ${offset}`;
            const batch = await this.optimizedQuery(`stream:${offset}`, batchQuery, params, connection);
            if (batch.length === 0) {
                hasMore = false;
            }
            else {
                yield batch;
                offset += batchSize;
                hasMore = batch.length === batchSize;
            }
            // Yield control to event loop
            await new Promise((resolve) => setImmediate(resolve));
        }
    }
    async getFromCache(key) {
        // Try local cache first (fastest)
        const local = this.getLocalCache(key);
        if (local !== null)
            return local;
        // Fall back to Redis
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Populate local cache
                this.setLocalCache(key, parsed, 300); // 5 min local TTL
                return parsed;
            }
        }
        catch (error) {
            console.warn(`Cache get error for key ${key}:`, error);
        }
        return null;
    }
    async setCache(key, value, ttl) {
        const effectiveTtl = ttl || this.cacheConfig.ttlSeconds;
        // Set in local cache
        this.setLocalCache(key, value, effectiveTtl);
        // Set in Redis
        try {
            await this.redis.setex(key, effectiveTtl, JSON.stringify(value));
        }
        catch (error) {
            console.warn(`Cache set error for key ${key}:`, error);
        }
    }
    getLocalCache(key) {
        const entry = this.localCache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expires) {
            this.localCache.delete(key);
            return null;
        }
        entry.hits++;
        return entry.value;
    }
    setLocalCache(key, value, ttlSeconds) {
        // Implement LRU eviction if cache is full
        if (this.localCache.size >= this.cacheConfig.maxSize) {
            this.evictLocalCache();
        }
        this.localCache.set(key, {
            value,
            expires: Date.now() + ttlSeconds * 1000,
            hits: 0,
        });
    }
    evictLocalCache() {
        if (this.cacheConfig.strategy === 'lru') {
            // Remove oldest entry
            const oldestKey = this.localCache.keys().next().value;
            if (oldestKey)
                this.localCache.delete(oldestKey);
        }
        else if (this.cacheConfig.strategy === 'lfu') {
            // Remove least frequently used
            let minHits = Infinity;
            let leastUsedKey = '';
            for (const [key, entry] of this.localCache.entries()) {
                if (entry.hits < minHits) {
                    minHits = entry.hits;
                    leastUsedKey = key;
                }
            }
            if (leastUsedKey)
                this.localCache.delete(leastUsedKey);
        }
    }
    async executeWithPooling(fn) {
        // Simple connection pooling simulation
        const poolKey = 'default';
        const pool = this.connectionPool.get(poolKey) || [];
        this.metrics.poolUtilization = pool.length / this.poolConfig.maxSize;
        return await fn();
    }
    schedulePrefetch(key, fn) {
        // Schedule prefetch of related data
        setImmediate(async () => {
            try {
                const prefetchKeys = this.generatePrefetchKeys(key);
                for (const prefetchKey of prefetchKeys) {
                    const exists = await this.getFromCache(prefetchKey);
                    if (!exists) {
                        const result = await fn();
                        await this.setCache(prefetchKey, result);
                    }
                }
            }
            catch (error) {
                console.warn('Prefetch error:', error);
            }
        });
    }
    generatePrefetchKeys(baseKey) {
        // Generate related keys for prefetching
        const parts = baseKey.split(':');
        const prefetchKeys = [];
        // Add parent/child relationships
        if (parts.length > 1) {
            prefetchKeys.push(parts.slice(0, -1).join(':'));
        }
        return prefetchKeys;
    }
    updateMetrics() {
        // Update memory usage
        this.metrics.memoryUsage = process.memoryUsage().heapUsed;
        // Emit metrics for monitoring
        console.log(JSON.stringify({
            event: 'hotpath_metrics',
            metrics: this.metrics,
            timestamp: new Date().toISOString(),
        }));
    }
    /**
     * Get current performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics counters
     */
    resetMetrics() {
        this.metrics = {
            executionTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            poolUtilization: 0,
            memoryUsage: 0,
        };
    }
    /**
     * Warm up cache with common queries
     */
    async warmupCache(warmupQueries) {
        console.log('Starting cache warmup...');
        const promises = warmupQueries.map(async ({ key, fn }) => {
            try {
                const result = await fn();
                await this.setCache(key, result);
                console.log(`Warmed up cache for key: ${key}`);
            }
            catch (error) {
                console.warn(`Warmup failed for key ${key}:`, error);
            }
        });
        await Promise.all(promises);
        console.log('Cache warmup completed');
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.redis.quit();
        this.localCache.clear();
        this.connectionPool.clear();
    }
}
exports.HotPathOptimizer = HotPathOptimizer;
// Performance monitoring utilities
class PerformanceMonitor {
    static measurements = new Map();
    static startMeasurement(label) {
        const start = perf_hooks_1.performance.now();
        return () => {
            const duration = perf_hooks_1.performance.now() - start;
            this.recordMeasurement(label, duration);
            return duration;
        };
    }
    static recordMeasurement(label, duration) {
        if (!this.measurements.has(label)) {
            this.measurements.set(label, []);
        }
        const measurements = this.measurements.get(label);
        measurements.push(duration);
        // Keep only last 1000 measurements
        if (measurements.length > 1000) {
            measurements.splice(0, measurements.length - 1000);
        }
    }
    static getStats(label) {
        const measurements = this.measurements.get(label);
        if (!measurements || measurements.length === 0)
            return null;
        const sorted = [...measurements].sort((a, b) => a - b);
        const count = sorted.length;
        return {
            count,
            min: sorted[0],
            max: sorted[count - 1],
            avg: sorted.reduce((a, b) => a + b, 0) / count,
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
        };
    }
    static getAllStats() {
        const stats = {};
        for (const label of this.measurements.keys()) {
            stats[label] = this.getStats(label);
        }
        return stats;
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
