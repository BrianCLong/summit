"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTierCache = void 0;
// @ts-nocheck - Duplicate property and variable issues
const lru_cache_1 = require("lru-cache");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const zlib_1 = require("zlib");
const StampedeProtection_js_1 = require("./StampedeProtection.js");
const logger = (0, pino_1.default)({ name: 'MultiTierCache' });
const tracer = api_1.trace.getTracer('advanced-caching');
/**
 * Multi-tier cache with L1 (memory), L2 (Redis), L3 (CDN)
 */
class MultiTierCache {
    config;
    l1Cache;
    l2Redis;
    stampedeProtection;
    stats = {
        l1: this.initTierStats(),
        l2: this.initTierStats(),
        l3: this.initTierStats(),
        overall: { hitRate: 0, missRate: 0, avgLatency: 0 },
    };
    constructor(config) {
        this.config = config;
        this.initializeL1();
        this.initializeL2();
        if (config.stampedePrevention) {
            this.stampedeProtection = new StampedeProtection_js_1.StampedeProtection(this.l2Redis, {
                lockTTL: 30000,
                lockRetryDelay: 100,
                maxRetries: 10,
            });
        }
    }
    initTierStats() {
        return {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: 0,
            avgLatency: 0,
        };
    }
    initializeL1() {
        if (this.config.l1?.enabled) {
            this.l1Cache = new lru_cache_1.LRUCache({
                max: this.config.l1.maxSize,
                ttl: this.config.l1.ttl,
                updateAgeOnGet: this.config.l1.updateAgeOnGet !== false,
            });
            logger.info({ maxSize: this.config.l1.maxSize }, 'L1 cache initialized');
        }
    }
    initializeL2() {
        if (this.config.l2?.enabled) {
            this.l2Redis = this.config.l2.redis;
            logger.info('L2 cache (Redis) initialized');
        }
    }
    /**
     * Get value from cache (checks all tiers)
     */
    async get(key, options) {
        const span = tracer.startSpan('MultiTierCache.get');
        const startTime = Date.now();
        try {
            // Try L1 first
            if (!options?.skipL1 && this.l1Cache) {
                const l1Result = this.l1Cache.get(key);
                if (l1Result) {
                    this.stats.l1.hits++;
                    span.setAttributes({ tier: 'l1', hit: true });
                    logger.debug({ key }, 'L1 cache hit');
                    return l1Result.value;
                }
                this.stats.l1.misses++;
            }
            // Try L2
            if (!options?.skipL2 && this.l2Redis) {
                const l2Result = await this.getFromL2(key);
                if (l2Result !== null) {
                    this.stats.l2.hits++;
                    span.setAttributes({ tier: 'l2', hit: true });
                    // Populate L1 on L2 hit
                    if (this.l1Cache && !options?.skipL1) {
                        this.setL1(key, l2Result, options);
                    }
                    logger.debug({ key }, 'L2 cache hit');
                    return l2Result;
                }
                this.stats.l2.misses++;
            }
            // L3 would be handled by CDN at edge
            span.setAttributes({ tier: 'miss', hit: false });
            return null;
        }
        catch (error) {
            span.recordException(error);
            logger.error({ key, error }, 'Cache get error');
            return null;
        }
        finally {
            const latency = Date.now() - startTime;
            this.updateLatency(latency);
            span.end();
        }
    }
    /**
     * Set value in cache (all tiers)
     */
    async set(key, value, options) {
        const span = tracer.startSpan('MultiTierCache.set');
        try {
            const ttl = options?.ttl || this.config.defaultTTL || 3600;
            const entry = {
                value,
                version: options?.version,
                metadata: {
                    tags: options?.tags,
                    dependencies: options?.dependencies,
                },
                createdAt: Date.now(),
                expiresAt: Date.now() + ttl * 1000,
            };
            // Set L1
            if (!options?.skipL1 && this.l1Cache) {
                this.setL1(key, value, options);
                this.stats.l1.sets++;
            }
            // Set L2
            if (!options?.skipL2 && this.l2Redis) {
                await this.setL2(key, entry, ttl);
                this.stats.l2.sets++;
            }
            span.setAttributes({
                ttl,
                hasMetadata: !!options?.tags || !!options?.dependencies,
                hasMetadata: Boolean(options?.tags) || Boolean(options?.dependencies),
            });
            logger.debug({ key, ttl }, 'Cache set');
        }
        catch (error) {
            span.recordException(error);
            logger.error({ key, error }, 'Cache set error');
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Get or set with loader function (prevents stampede)
     */
    async getOrSet(key, loader, options) {
        const span = tracer.startSpan('MultiTierCache.getOrSet');
        try {
            // Try to get from cache
            const cached = await this.get(key, options);
            if (cached !== null) {
                span.setAttribute('cached', true);
                return cached;
            }
            // Use stampede protection if enabled
            if (this.stampedeProtection) {
                const value = await this.stampedeProtection.execute(key, loader);
                await this.set(key, value, options);
                return value;
            }
            // Load and cache
            const value = await loader();
            await this.set(key, value, options);
            span.setAttribute('cached', false);
            return value;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Delete from all tiers
     */
    async delete(key) {
        const span = tracer.startSpan('MultiTierCache.delete');
        try {
            if (this.l1Cache) {
                this.l1Cache.delete(key);
                this.stats.l1.deletes++;
            }
            if (this.l2Redis) {
                await this.l2Redis.del(this.getL2Key(key));
                this.stats.l2.deletes++;
            }
            logger.debug({ key }, 'Cache deleted');
        }
        catch (error) {
            span.recordException(error);
            logger.error({ key, error }, 'Cache delete error');
        }
        finally {
            span.end();
        }
    }
    /**
     * Delete by pattern
     */
    async deleteByPattern(pattern) {
        const span = tracer.startSpan('MultiTierCache.deleteByPattern');
        try {
            let deletedCount = 0;
            if (this.l2Redis) {
                const keys = await this.l2Redis.keys(this.getL2Key(pattern));
                if (keys.length > 0) {
                    deletedCount = await this.l2Redis.del(...keys);
                }
            }
            // L1 pattern deletion
            if (this.l1Cache) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                for (const key of this.l1Cache.keys()) {
                    if (regex.test(key)) {
                        this.l1Cache.delete(key);
                        deletedCount++;
                    }
                }
            }
            span.setAttribute('deleted', deletedCount);
            logger.debug({ pattern, deletedCount }, 'Cache deleted by pattern');
            return deletedCount;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const totalHits = this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits;
        const totalMisses = this.stats.l1.misses + this.stats.l2.misses + this.stats.l3.misses;
        const total = totalHits + totalMisses;
        this.stats.overall = {
            hitRate: total > 0 ? totalHits / total : 0,
            missRate: total > 0 ? totalMisses / total : 0,
            avgLatency: this.stats.overall.avgLatency,
        };
        if (this.l1Cache) {
            this.stats.l1.size = this.l1Cache.size;
        }
        return { ...this.stats };
    }
    /**
     * Clear all caches
     */
    async clear() {
        if (this.l1Cache) {
            this.l1Cache.clear();
        }
        if (this.l2Redis) {
            const pattern = this.getL2Key('*');
            const keys = await this.l2Redis.keys(pattern);
            if (keys.length > 0) {
                await this.l2Redis.del(...keys);
            }
        }
        logger.info('All caches cleared');
    }
    // Private methods
    setL1(key, value, options) {
        if (!this.l1Cache)
            return;
        if (!this.l1Cache) {
            return;
        }
        const ttl = options?.ttl || this.config.l1?.ttl || 300;
        const entry = {
            value,
            version: options?.version,
            metadata: {
                tags: options?.tags,
                dependencies: options?.dependencies,
            },
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl * 1000,
        };
        this.l1Cache.set(key, entry);
    }
    async getFromL2(key) {
        if (!this.l2Redis)
            return null;
        const data = await this.l2Redis.getBuffer(this.getL2Key(key));
        if (!data)
            return null;
        if (!this.l2Redis) {
            return null;
        }
        const data = await this.l2Redis.getBuffer(this.getL2Key(key));
        if (!data) {
            return null;
        }
        try {
            const entry = JSON.parse(data.toString());
            // Check if compressed
            if (entry.metadata?.compressed) {
                const decompressed = (0, zlib_1.gunzipSync)(Buffer.from(entry.value));
                entry.value = JSON.parse(decompressed.toString());
            }
            return entry.value;
        }
        catch (error) {
            logger.error({ key, error }, 'L2 deserialization error');
            return null;
        }
    }
    async setL2(key, entry, ttl) {
        if (!this.l2Redis)
            return;
        if (!this.l2Redis) {
            return;
        }
        try {
            let dataToStore = entry;
            // Compress if above threshold
            const threshold = this.config.l2?.compressionThreshold || 1024;
            const serialized = JSON.stringify(entry);
            if (serialized.length > threshold) {
                const compressed = (0, zlib_1.gzipSync)(serialized);
                dataToStore = {
                    ...entry,
                    value: compressed,
                    metadata: {
                        ...entry.metadata,
                        compressed: true,
                        size: serialized.length,
                    },
                };
            }
            await this.l2Redis.setex(this.getL2Key(key), ttl, JSON.stringify(dataToStore));
        }
        catch (error) {
            logger.error({ key, error }, 'L2 set error');
            throw error;
        }
    }
    getL2Key(key) {
        const prefix = this.config.l2?.keyPrefix || 'cache';
        return `${prefix}:${key}`;
    }
    updateLatency(latency) {
        const currentAvg = this.stats.overall.avgLatency;
        const totalRequests = this.stats.l1.hits +
            this.stats.l1.misses +
            this.stats.l2.hits +
            this.stats.l2.misses;
        this.stats.overall.avgLatency =
            totalRequests > 0
                ? (currentAvg * (totalRequests - 1) + latency) / totalRequests
                : latency;
    }
}
exports.MultiTierCache = MultiTierCache;
