"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseCache = void 0;
exports.getLocalCacheStats = getLocalCacheStats;
exports.buildCacheKey = buildCacheKey;
exports.getCachedJson = getCachedJson;
exports.setCachedJson = setCachedJson;
exports.cacheQueryResult = cacheQueryResult;
exports.flushLocalCache = flushLocalCache;
exports.invalidateCache = invalidateCache;
exports.cached = cached;
const database_js_1 = require("../config/database.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
// Memory Tier (L1)
class MemoryTier {
    cache = new Map();
    name = 'memory';
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.ts > entry.ttl * 1000) {
            this.cache.delete(key);
            return null;
        }
        return entry.val;
    }
    async set(key, value, ttl) {
        this.cache.set(key, { ts: Date.now(), ttl, val: value });
        // Simple eviction policy
        if (this.cache.size > 10000) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        cacheMetrics_js_1.cacheLocalSize?.labels?.('default')?.set?.(this.cache.size);
    }
    async del(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}
// Redis Tier (L2)
class RedisTier {
    name = 'redis';
    async get(key) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return null;
        return redis.get(key);
    }
    async set(key, value, ttl) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return;
        await redis.set(key, value, 'EX', ttl);
    }
    async del(key) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return;
        await redis.del(key);
    }
    // Redis specific methods for tagging
    async addTag(tag, key) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return;
        await redis.sAdd(`idx:${tag}`, key);
        await redis.expire(`idx:${tag}`, 86400); // Index expires in 24h
    }
    async invalidateByTag(tag) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return;
        const keys = await redis.sMembers(`idx:${tag}`);
        if (keys.length > 0) {
            await redis.del(...keys);
            await redis.del(`idx:${tag}`);
        }
    }
}
// Singleton instances
const l1 = new MemoryTier();
const l2 = new RedisTier();
function getLocalCacheStats() {
    return { size: l1.cache?.size ?? 0 };
}
/**
 * Build a cache key from namespace and item
 */
function buildCacheKey(namespace, item) {
    return `${namespace}:${item}`;
}
/**
 * Get cached JSON from L1/L2
 */
async function getCachedJson(key, options = {}) {
    const ttl = options.ttlSeconds ?? 60;
    // Try L1
    const l1Hit = await l1.get(key);
    if (l1Hit)
        return JSON.parse(l1Hit);
    // Try L2
    try {
        const l2Hit = await l2.get(key);
        if (l2Hit) {
            await l1.set(key, l2Hit, ttl);
            return JSON.parse(l2Hit);
        }
    }
    catch (e) { }
    return null;
}
/**
 * Set cached JSON in L1/L2
 */
async function setCachedJson(key, payload, options = {}) {
    const ttl = options.ttlSeconds ?? 60;
    const valStr = JSON.stringify(payload);
    await l1.set(key, valStr, ttl);
    try {
        await l2.set(key, valStr, ttl);
        if (options.indexPrefixes) {
            for (const prefix of options.indexPrefixes) {
                await l2.addTag(prefix, key);
            }
        }
    }
    catch (e) { }
}
exports.responseCache = {
    getCachedJson,
    setCachedJson,
};
/**
 * Cache query result specifically
 */
async function cacheQueryResult(query, params, fetcher, options = {}) {
    const keyParts = ['query', options.tenant || 'global', query, params];
    return cached(keyParts, options.ttlSec || 300, fetcher, 'query');
}
function flushLocalCache() {
    l1.clear();
}
/**
 * Invalidate cache by tag (Smart Invalidation)
 */
async function invalidateCache(tag, tenantId) {
    // Invalidate in Redis
    await l2.invalidateByTag(tag);
    if (tenantId) {
        await l2.invalidateByTag(`${tag}:${tenantId}`);
    }
    // Note: We can't easily invalidate specific keys in L1 across all instances
    // without a pub/sub mechanism. For now, L1 relies on short TTLs.
    // Ideally, subscribe to an invalidation channel here.
}
async function cached(keyParts, ttlOrOptions, fetcher, opOverride, tagsOverride) {
    const ttlSec = typeof ttlOrOptions === 'number' ? ttlOrOptions : (ttlOrOptions.ttlSec ?? 300);
    const op = opOverride || (typeof ttlOrOptions === 'object' ? ttlOrOptions.op : 'generic') || 'generic';
    const tags = tagsOverride || (typeof ttlOrOptions === 'object' ? ttlOrOptions.tags : []) || [];
    const redisDisabled = process.env.REDIS_DISABLE === '1';
    const key = 'gql:' + node_crypto_1.default.createHash('sha1').update(JSON.stringify(keyParts)).digest('hex');
    const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';
    // L1 Check
    const l1Hit = await l1.get(key);
    if (l1Hit) {
        (0, cacheMetrics_js_1.recHit)('memory', op, tenant);
        return JSON.parse(l1Hit);
    }
    // L2 Check
    if (!redisDisabled) {
        try {
            const l2Hit = await l2.get(key);
            if (l2Hit) {
                (0, cacheMetrics_js_1.recHit)('redis', op, tenant);
                // Populate L1
                await l1.set(key, l2Hit, ttlSec);
                return JSON.parse(l2Hit);
            }
        }
        catch (e) {
            // Ignore redis errors
        }
    }
    // Fetch
    (0, cacheMetrics_js_1.recMiss)(redisDisabled ? 'memory' : 'redis', op, tenant);
    const val = await fetcher();
    const valStr = JSON.stringify(val);
    // Populate L1
    await l1.set(key, valStr, ttlSec);
    (0, cacheMetrics_js_1.recSet)('memory', op, tenant);
    // Populate L2
    if (!redisDisabled) {
        try {
            await l2.set(key, valStr, ttlSec);
            (0, cacheMetrics_js_1.recSet)('redis', op, tenant);
            // Auto-tagging based on key parts prefix
            const prefix = String(keyParts?.[0] ?? 'misc');
            const allTags = new Set([...tags, prefix]);
            if (keyParts?.[1]) {
                allTags.add(`${prefix}:${keyParts[1]}`);
            }
            for (const tag of allTags) {
                await l2.addTag(tag, key);
            }
        }
        catch (e) {
            // Ignore
        }
    }
    return val;
}
