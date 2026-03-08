"use strict";
/**
 * Tenant-Scoped Cache Wrapper
 *
 * Prevents cache poisoning by ensuring all cache keys include tenant_id.
 * Compatible with Redis, in-memory caches, and any key-value store.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantCache = void 0;
exports.generateTenantCacheKey = generateTenantCacheKey;
exports.createTenantCache = createTenantCache;
exports.extractTenantFromCacheKey = extractTenantFromCacheKey;
exports.validateTenantCacheKey = validateTenantCacheKey;
const tenant_context_js_1 = require("../security/tenant-context.js");
/**
 * Generate a tenant-scoped cache key
 *
 * Format: `tenant:{tenantId}:{namespace}:{key}`
 *
 * @example
 * ```typescript
 * const key = generateTenantCacheKey(context, 'user:permissions', userId);
 * // => "tenant:acme-corp:user:permissions:user-123"
 * ```
 */
function generateTenantCacheKey(context, namespace, key) {
    (0, tenant_context_js_1.validateTenantContext)(context);
    return `tenant:${context.tenantId}:${namespace}:${key}`;
}
/**
 * Tenant-aware cache wrapper
 *
 * Automatically prefixes all keys with tenant_id to prevent cache poisoning.
 */
class TenantCache {
    cache;
    context;
    namespace;
    defaultTTL;
    constructor(cache, // Redis client or any cache with get/set/del methods
    context, namespace, defaultTTL = 900 // 15 minutes
    ) {
        this.cache = cache;
        this.context = context;
        this.namespace = namespace;
        this.defaultTTL = defaultTTL;
        (0, tenant_context_js_1.validateTenantContext)(context);
    }
    /**
     * Get value from cache
     */
    async get(key) {
        const tenantKey = this.buildKey(key);
        const value = await this.cache.get(tenantKey);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    /**
     * Set value in cache with TTL
     */
    async set(key, value, ttlSeconds) {
        const tenantKey = this.buildKey(key);
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        const ttl = ttlSeconds ?? this.defaultTTL;
        if (this.cache.setex) {
            await this.cache.setex(tenantKey, ttl, serialized);
        }
        else {
            await this.cache.set(tenantKey, serialized, 'EX', ttl);
        }
    }
    /**
     * Delete value from cache
     */
    async del(key) {
        const tenantKey = this.buildKey(key);
        await this.cache.del(tenantKey);
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        const tenantKey = this.buildKey(key);
        const result = await this.cache.exists(tenantKey);
        return result > 0;
    }
    /**
     * Increment value (atomic)
     */
    async incr(key) {
        const tenantKey = this.buildKey(key);
        return await this.cache.incr(tenantKey);
    }
    /**
     * Decrement value (atomic)
     */
    async decr(key) {
        const tenantKey = this.buildKey(key);
        return await this.cache.decr(tenantKey);
    }
    /**
     * Set with expiration (alias for set)
     */
    async setWithExpiry(key, value, ttlSeconds) {
        return this.set(key, value, ttlSeconds);
    }
    /**
     * Get multiple keys at once
     */
    async mget(keys) {
        const tenantKeys = keys.map(k => this.buildKey(k));
        const values = await this.cache.mget(...tenantKeys);
        return values.map((v) => {
            if (!v)
                return null;
            try {
                return JSON.parse(v);
            }
            catch {
                return v;
            }
        });
    }
    /**
     * Delete all keys matching pattern (USE WITH CAUTION)
     */
    async deletePattern(pattern) {
        const tenantPattern = this.buildKey(pattern);
        const keys = await this.cache.keys(tenantPattern);
        if (keys.length === 0)
            return 0;
        await this.cache.del(...keys);
        return keys.length;
    }
    /**
     * Clear all cache entries for this tenant/namespace
     */
    async clear() {
        return this.deletePattern('*');
    }
    /**
     * Get tenant context
     */
    getTenantContext() {
        return this.context;
    }
    /**
     * Build tenant-scoped cache key
     */
    buildKey(key) {
        return generateTenantCacheKey(this.context, this.namespace, key);
    }
}
exports.TenantCache = TenantCache;
/**
 * Create a tenant-scoped cache instance
 *
 * @example
 * ```typescript
 * const cache = createTenantCache(redisClient, tenantContext, 'user:permissions');
 * await cache.set(userId, permissions, 900); // 15 min TTL
 * const permissions = await cache.get(userId);
 * ```
 */
function createTenantCache(cacheClient, context, namespace, defaultTTL) {
    return new TenantCache(cacheClient, context, namespace, defaultTTL);
}
/**
 * Extract tenant ID from a tenant-scoped cache key
 * Useful for debugging and monitoring
 */
function extractTenantFromCacheKey(key) {
    const match = key.match(/^tenant:([^:]+):/);
    return match ? match[1] : null;
}
/**
 * Validate that a cache key is properly tenant-scoped
 * Throws error if key doesn't include tenant prefix
 */
function validateTenantCacheKey(key) {
    if (!key.startsWith('tenant:')) {
        throw new Error(`Cache key must be tenant-scoped (start with "tenant:"). Got: ${key.substring(0, 50)}...`);
    }
}
