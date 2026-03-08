"use strict";
/**
 * Distributed Cache Service
 *
 * Redis-based distributed cache with L1 local cache for hot data.
 * Provides cache-aside, write-through, and write-behind patterns.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module cache/DistributedCacheService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedCacheService = void 0;
exports.getDistributedCache = getDistributedCache;
const uuid_1 = require("uuid");
const lru_cache_1 = require("lru-cache");
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'cache-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'DistributedCacheService',
    };
}
// ============================================================================
// Distributed Cache Service
// ============================================================================
class DistributedCacheService {
    redis;
    subscriber = null;
    l1Cache; // LRUCache instance
    config;
    stats;
    writeBuffer = new Map();
    flushInterval = null;
    constructor(redis, config = {}) {
        this.redis = redis;
        this.config = {
            defaultTTLSeconds: config.defaultTTLSeconds ?? 300,
            maxL1Entries: config.maxL1Entries ?? 10000,
            l1TTLMs: config.l1TTLMs ?? 60000,
            compressionThreshold: config.compressionThreshold ?? 1024,
            keyPrefix: config.keyPrefix ?? 'cache:',
            enableInvalidation: config.enableInvalidation ?? true,
            invalidationChannel: config.invalidationChannel ?? 'cache:invalidation',
        };
        // Initialize L1 cache (local, in-memory)
        this.l1Cache = new lru_cache_1.LRUCache({
            max: this.config.maxL1Entries,
            ttl: this.config.l1TTLMs,
            updateAgeOnGet: true,
        });
        // Initialize stats
        this.stats = {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            invalidations: 0,
            compressions: 0,
        };
        // Set up invalidation listener
        if (this.config.enableInvalidation) {
            this.setupInvalidationListener();
        }
        logger_js_1.default.info({ config: this.config }, 'DistributedCacheService initialized');
    }
    // --------------------------------------------------------------------------
    // Core Cache Operations
    // --------------------------------------------------------------------------
    /**
     * Get a value from cache (L1 first, then L2)
     */
    async get(key) {
        const fullKey = this.buildKey(key);
        // Try L1 cache first
        const l1Entry = this.l1Cache.get(fullKey);
        if (l1Entry && l1Entry.expiresAt > Date.now()) {
            this.stats.l1Hits++;
            logger_js_1.default.debug({ key, source: 'l1' }, 'Cache hit');
            return (0, data_envelope_js_1.createDataEnvelope)(l1Entry.value, {
                source: 'DistributedCacheService:L1',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Cache hit from L1'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        this.stats.l1Misses++;
        // Try L2 (Redis)
        try {
            const redisValue = await this.redis.get(fullKey);
            if (redisValue) {
                this.stats.l2Hits++;
                const entry = JSON.parse(redisValue);
                // Decompress if needed
                const value = entry.compressed
                    ? await this.decompress(entry.value)
                    : entry.value;
                // Promote to L1
                this.l1Cache.set(fullKey, {
                    ...entry,
                    value,
                    compressed: false,
                });
                logger_js_1.default.debug({ key, source: 'l2' }, 'Cache hit');
                return (0, data_envelope_js_1.createDataEnvelope)(value, {
                    source: 'DistributedCacheService:L2',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Cache hit from L2'),
                    classification: data_envelope_js_1.DataClassification.INTERNAL,
                });
            }
            this.stats.l2Misses++;
        }
        catch (error) {
            logger_js_1.default.error({ error, key }, 'Redis get error');
        }
        logger_js_1.default.debug({ key }, 'Cache miss');
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'DistributedCacheService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Cache miss'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Set a value in cache
     */
    async set(key, value, options = {}) {
        const fullKey = this.buildKey(key);
        const ttl = options.ttlSeconds ?? this.config.defaultTTLSeconds;
        const tags = options.tags ?? [];
        const strategy = options.strategy ?? 'cache-aside';
        const now = Date.now();
        const entry = {
            value,
            createdAt: now,
            expiresAt: now + ttl * 1000,
            tags,
            compressed: false,
        };
        try {
            // Check if compression needed
            const serialized = JSON.stringify(entry);
            let toStore = serialized;
            if (serialized.length > this.config.compressionThreshold) {
                entry.value = await this.compress(value);
                entry.compressed = true;
                toStore = JSON.stringify(entry);
                this.stats.compressions++;
            }
            // Apply strategy
            switch (strategy) {
                case 'write-through':
                    // Write to both L1 and L2 synchronously
                    this.l1Cache.set(fullKey, { ...entry, value, compressed: false });
                    await this.redis.setex(fullKey, ttl, toStore);
                    break;
                case 'write-behind':
                    // Write to L1 immediately, buffer L2 write
                    this.l1Cache.set(fullKey, { ...entry, value, compressed: false });
                    this.bufferWrite(fullKey, toStore, ttl);
                    break;
                case 'cache-aside':
                default:
                    // Write to L2 first, then L1
                    await this.redis.setex(fullKey, ttl, toStore);
                    this.l1Cache.set(fullKey, { ...entry, value, compressed: false });
                    break;
            }
            // Store tag associations
            if (tags.length > 0) {
                await this.indexTags(fullKey, tags, ttl);
            }
            logger_js_1.default.debug({ key, ttl, strategy }, 'Cache set');
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Cache set successful'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, key }, 'Cache set error');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Cache set failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Delete a key from cache
     */
    async delete(key) {
        const fullKey = this.buildKey(key);
        try {
            // Delete from both caches
            this.l1Cache.delete(fullKey);
            await this.redis.del(fullKey);
            // Broadcast invalidation
            await this.broadcastInvalidation(fullKey);
            logger_js_1.default.debug({ key }, 'Cache delete');
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Cache delete successful'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, key }, 'Cache delete error');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Cache delete failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Delete all keys with a specific tag
     */
    async deleteByTag(tag) {
        const tagKey = `${this.config.keyPrefix}tag:${tag}`;
        try {
            const keys = await this.redis.smembers(tagKey);
            if (keys.length === 0) {
                return (0, data_envelope_js_1.createDataEnvelope)(0, {
                    source: 'DistributedCacheService',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No keys found for tag'),
                    classification: data_envelope_js_1.DataClassification.INTERNAL,
                });
            }
            // Delete all tagged keys
            for (const key of keys) {
                this.l1Cache.delete(key);
            }
            await this.redis.del(...keys, tagKey);
            // Broadcast invalidation for all keys
            for (const key of keys) {
                await this.broadcastInvalidation(key);
            }
            this.stats.invalidations += keys.length;
            logger_js_1.default.info({ tag, count: keys.length }, 'Cache invalidated by tag');
            return (0, data_envelope_js_1.createDataEnvelope)(keys.length, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Tag invalidation successful'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, tag }, 'Cache tag invalidation error');
            return (0, data_envelope_js_1.createDataEnvelope)(0, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Tag invalidation failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Get or set pattern - fetch from cache or compute
     */
    async getOrSet(key, fetcher, options = {}) {
        // Check cache first (unless force refresh)
        if (!options.forceRefresh) {
            const cached = await this.get(key);
            if (cached.data !== null) {
                return cached;
            }
        }
        // Fetch fresh data
        const value = await fetcher();
        // Store in cache
        await this.set(key, value, {
            ttlSeconds: options.ttlSeconds,
            tags: options.tags,
        });
        return (0, data_envelope_js_1.createDataEnvelope)(value, {
            source: 'DistributedCacheService:fetcher',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Value fetched and cached'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Invalidation
    // --------------------------------------------------------------------------
    async setupInvalidationListener() {
        try {
            this.subscriber = this.redis.duplicate();
            await this.subscriber.subscribe(this.config.invalidationChannel);
            this.subscriber.on('message', (channel, message) => {
                if (channel === this.config.invalidationChannel) {
                    const key = message;
                    this.l1Cache.delete(key);
                    this.stats.invalidations++;
                    logger_js_1.default.debug({ key }, 'L1 cache invalidated via pub/sub');
                }
            });
            logger_js_1.default.info('Cache invalidation listener started');
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Failed to setup invalidation listener');
        }
    }
    async broadcastInvalidation(key) {
        if (this.config.enableInvalidation) {
            try {
                await this.redis.publish(this.config.invalidationChannel, key);
            }
            catch (error) {
                logger_js_1.default.error({ error, key }, 'Failed to broadcast invalidation');
            }
        }
    }
    // --------------------------------------------------------------------------
    // Write-Behind Buffer
    // --------------------------------------------------------------------------
    bufferWrite(key, value, ttl) {
        this.writeBuffer.set(key, { value, ttl });
        // Start flush interval if not running
        if (!this.flushInterval) {
            this.flushInterval = setInterval(() => this.flushWriteBuffer(), 100);
        }
    }
    async flushWriteBuffer() {
        if (this.writeBuffer.size === 0) {
            if (this.flushInterval) {
                clearInterval(this.flushInterval);
                this.flushInterval = null;
            }
            return;
        }
        const pipeline = this.redis.pipeline();
        for (const [key, { value, ttl }] of this.writeBuffer) {
            pipeline.setex(key, ttl, value);
        }
        this.writeBuffer.clear();
        try {
            await pipeline.exec();
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Failed to flush write buffer');
        }
    }
    // --------------------------------------------------------------------------
    // Tag Indexing
    // --------------------------------------------------------------------------
    async indexTags(key, tags, ttl) {
        const pipeline = this.redis.pipeline();
        for (const tag of tags) {
            const tagKey = `${this.config.keyPrefix}tag:${tag}`;
            pipeline.sadd(tagKey, key);
            pipeline.expire(tagKey, ttl);
        }
        await pipeline.exec();
    }
    // --------------------------------------------------------------------------
    // Compression
    // --------------------------------------------------------------------------
    async compress(value) {
        const json = JSON.stringify(value);
        const buffer = await gzip(json);
        return buffer.toString('base64');
    }
    async decompress(compressed) {
        try {
            const buffer = Buffer.from(compressed, 'base64');
            const decompressed = await gunzip(buffer);
            return JSON.parse(decompressed.toString('utf-8'));
        }
        catch (error) {
            // Fallback for legacy uncompressed data or errors
            try {
                return JSON.parse(Buffer.from(compressed, 'base64').toString('utf-8'));
            }
            catch (innerError) {
                logger_js_1.default.error({ error, innerError }, 'Failed to decompress cache value');
                throw error;
            }
        }
    }
    // --------------------------------------------------------------------------
    // Utilities
    // --------------------------------------------------------------------------
    buildKey(key) {
        return `${this.config.keyPrefix}${key}`;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)(this.stats, {
            source: 'DistributedCacheService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clear all caches
     */
    async clear() {
        try {
            this.l1Cache.clear();
            const keys = await this.redis.keys(`${this.config.keyPrefix}*`);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            logger_js_1.default.info('All caches cleared');
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Cache cleared'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Failed to clear cache');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'DistributedCacheService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Cache clear failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Shutdown the cache service
     */
    async shutdown() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            await this.flushWriteBuffer();
        }
        if (this.subscriber) {
            await this.subscriber.unsubscribe();
            await this.subscriber.quit();
        }
        logger_js_1.default.info('DistributedCacheService shutdown complete');
    }
}
exports.DistributedCacheService = DistributedCacheService;
// Export singleton factory
let instance = null;
function getDistributedCache(redis, config) {
    if (!instance) {
        instance = new DistributedCacheService(redis, config);
    }
    return instance;
}
exports.default = DistributedCacheService;
