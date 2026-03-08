"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantCacheManager = getTenantCacheManager;
exports.getTenantDistributedCache = getTenantDistributedCache;
exports.getCacheManager = getCacheManager;
exports.getDistributedCache = getDistributedCache;
exports._resetCacheManagerForTesting = _resetCacheManagerForTesting;
const redis_js_1 = require("../db/redis.js");
const AdvancedCachingStrategy_js_1 = require("./AdvancedCachingStrategy.js");
const DistributedCacheService_js_1 = require("./DistributedCacheService.js");
const logger_js_1 = require("../config/logger.js");
let cacheManagerInstance = null;
let distributedCacheInstance = null;
const tenantCacheManagers = new Map();
const tenantDistributedCaches = new Map();
/**
 * Get a tenant-aware CacheManager.
 * Automatically scopes keys to the current tenant from correlation context.
 */
function getTenantCacheManager() {
    const store = logger_js_1.correlationStorage.getStore();
    const tenantId = store?.get('tenantId') || 'global';
    if (!tenantCacheManagers.has(tenantId)) {
        const redisClient = (0, redis_js_1.getRedisClient)('cache');
        const manager = new AdvancedCachingStrategy_js_1.CacheManager(redisClient, {
            keyPrefix: `summit:tenant:${tenantId}:cache:`,
            defaultTtl: 600,
            enableMetrics: true,
        });
        tenantCacheManagers.set(tenantId, manager);
    }
    return tenantCacheManagers.get(tenantId);
}
/**
 * Get a tenant-aware DistributedCacheService.
 * Automatically scopes keys to the current tenant from correlation context.
 */
function getTenantDistributedCache() {
    const store = logger_js_1.correlationStorage.getStore();
    const tenantId = store?.get('tenantId') || 'global';
    if (!tenantDistributedCaches.has(tenantId)) {
        const redisClient = (0, redis_js_1.getRedisClient)('dist');
        const service = new DistributedCacheService_js_1.DistributedCacheService(redisClient, {
            keyPrefix: `summit:tenant:${tenantId}:dist:`,
            defaultTTLSeconds: 300,
            enableInvalidation: true
        });
        tenantDistributedCaches.set(tenantId, service);
    }
    return tenantDistributedCaches.get(tenantId);
}
/**
 * Get the singleton instance of the advanced CacheManager.
 * Initializes it if it doesn't exist.
 * This manager uses the AdvancedCachingStrategy pattern.
 * Uses the 'cache' Redis partition (REDIS_CACHE_HOST or defaults to REDIS_HOST).
 */
function getCacheManager() {
    if (!cacheManagerInstance) {
        // Partitioning: Use 'cache' specific Redis client
        const redisClient = (0, redis_js_1.getRedisClient)('cache');
        // We need to adapt the existing Redis client (which is ioredis) to the RedisClientInterface
        // expected by CacheManager.
        cacheManagerInstance = new AdvancedCachingStrategy_js_1.CacheManager(redisClient, {
            keyPrefix: 'summit:cache:',
            defaultTtl: 600, // 10 minutes
            enableMetrics: true,
        });
    }
    return cacheManagerInstance;
}
/**
 * Get the singleton instance of the DistributedCacheService.
 * This service implements L1/L2 caching with Data Governance envelopes.
 * Uses the 'dist' Redis partition (REDIS_DIST_HOST or defaults to REDIS_HOST).
 */
function getDistributedCache() {
    if (!distributedCacheInstance) {
        // Partitioning: Use 'dist' specific Redis client
        const redisClient = (0, redis_js_1.getRedisClient)('dist');
        distributedCacheInstance = new DistributedCacheService_js_1.DistributedCacheService(redisClient, {
            keyPrefix: 'summit:dist:',
            defaultTTLSeconds: 300,
            enableInvalidation: true
        });
    }
    return distributedCacheInstance;
}
/**
 * Reset the cache manager instance (useful for testing)
 */
function _resetCacheManagerForTesting() {
    cacheManagerInstance = null;
    distributedCacheInstance = null;
    tenantCacheManagers.clear();
    tenantDistributedCaches.clear();
}
