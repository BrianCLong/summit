"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheManager = exports.CACHE_PREFIX = void 0;
const factory_js_1 = require("../cache/factory.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'RedisCacheManager' });
exports.CACHE_PREFIX = {
    ENTITY: 'entity',
    RELATIONSHIP: 'relationship',
    INVESTIGATION: 'investigation',
};
/**
 * Adapter class to maintain backward compatibility with the old RedisCacheManager
 * while leveraging the new AdvancedCachingStrategy.
 */
class RedisCacheManager {
    cacheManager = (0, factory_js_1.getCacheManager)();
    getFullKey(prefix, key, tenantId) {
        // The CacheManager applies its own prefix (summit:cache:), so we just provide the rest
        return `${prefix}:${tenantId}:${key}`;
    }
    async get(prefix, key, tenantId) {
        const cacheKey = this.getFullKey(prefix, key, tenantId);
        try {
            return await this.cacheManager.get(cacheKey);
        }
        catch (error) {
            logger.error({ error, key: cacheKey }, 'Error getting from cache');
            return null;
        }
    }
    async set(prefix, key, value, tenantId, ttl = 300) {
        const cacheKey = this.getFullKey(prefix, key, tenantId);
        try {
            await this.cacheManager.set(cacheKey, value, { ttl });
        }
        catch (error) {
            logger.error({ error, key: cacheKey }, 'Error setting cache');
        }
    }
    async delete(prefix, key, tenantId) {
        const cacheKey = this.getFullKey(prefix, key, tenantId);
        try {
            await this.cacheManager.delete(cacheKey);
        }
        catch (error) {
            logger.error({ error, key: cacheKey }, 'Error deleting from cache');
        }
    }
    async deleteByPattern(pattern) {
        try {
            // AdvancedCachingStrategy handles pattern invalidation
            return await this.cacheManager.invalidateByPattern(pattern);
        }
        catch (error) {
            logger.error({ error, pattern }, 'Error deleting by pattern');
            return 0;
        }
    }
    async invalidateGraphQLQueries(tenantId) {
        // We match the pattern expected by the old implementation, but routed through the new manager
        await this.deleteByPattern(`graphql:${tenantId}:*`);
    }
    async invalidateGraphMetrics(tenantId) {
        await this.deleteByPattern(`metrics:${tenantId}:*`);
    }
    getAllStats() {
        return this.cacheManager.getMetrics();
    }
}
exports.RedisCacheManager = RedisCacheManager;
