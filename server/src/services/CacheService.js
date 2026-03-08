"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const factory_js_1 = require("../cache/factory.js");
const metrics_js_1 = require("../utils/metrics.js");
const config_js_1 = require("../config.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
/**
 * @class CacheService
 * @description Provides a layer of abstraction for caching operations, backed by Redis and memory (L1/L2).
 * It delegates to the AdvancedCachingStrategy (CacheManager) for robust caching with circuit breakers.
 *
 * @example
 * ```typescript
 * import { cacheService } from './CacheService.js';
 *
 * async function getUser(userId: string) {
 *   return cacheService.getOrSet(`user:${userId}`, async () => {
 *     // Fetch user from the database
 *     return database.users.find(userId);
 *   }, 3600); // Cache for 1 hour
 * }
 * ```
 */
class CacheService {
    metrics;
    namespace = 'cache';
    defaultTtl;
    enabled;
    cacheManager;
    /**
     * @constructor
     * @description Initializes the CacheService, setting up metrics and configuration.
     */
    constructor() {
        this.metrics = new metrics_js_1.PrometheusMetrics('cache_service');
        this.metrics.createCounter('ops_total', 'Total cache operations', ['operation', 'status']);
        this.defaultTtl = config_js_1.cfg.CACHE_TTL_DEFAULT;
        this.enabled = config_js_1.cfg.CACHE_ENABLED;
        this.cacheManager = (0, factory_js_1.getCacheManager)();
    }
    /**
     * @private
     * @method getKey
     * @description Prepends the namespace to the cache key.
     * @param {string} key - The original cache key.
     * @returns {string} The namespaced cache key.
     */
    getKey(key) {
        // CacheManager handles its own prefixing (summit:cache:), but to maintain backward compatibility
        // with existing keys or specific namespace logic, we keep this.
        // However, CacheManager might double-prefix if we are not careful.
        // The previous implementation used "cache:<key>".
        // CacheManager uses "summit:cache:<key>".
        // We will pass the raw key to CacheManager and let it handle the standard prefix.
        // If we want to keep the 'cache' namespace explicitly:
        return `${this.namespace}:${key}`;
    }
    /**
     * @method get
     * @description Retrieves a value from the cache.
     * @template T
     * @param {string} key - The key of the item to retrieve.
     * @returns {Promise<T | null>} The cached value, or null if it doesn't exist or an error occurs.
     *
     * @example
     * ```typescript
     * const user = await cacheService.get<User>('user:123');
     * ```
     */
    async get(key) {
        if (!this.enabled)
            return null;
        try {
            // CacheManager handles JSON parsing internally
            const data = await this.cacheManager.get(this.getKey(key));
            if (data) {
                this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'hit' });
                return data;
            }
            this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'miss' });
            return null;
        }
        catch (error) {
            logger_js_1.default.error({ err: error, key }, 'Cache get error');
            this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'error' });
            return null;
        }
    }
    /**
     * @method set
     * @description Sets a value in the cache with an optional TTL.
     * @param {string} key - The key for the cache entry.
     * @param {*} value - The value to cache.
     * @param {number} [ttl] - The time-to-live for the cache entry in seconds. Defaults to the system's default TTL.
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await cacheService.set('user:123', { name: 'John Doe' }, 3600);
     * ```
     */
    async set(key, value, ttl) {
        if (!this.enabled)
            return;
        try {
            const expiry = ttl || this.defaultTtl;
            await this.cacheManager.set(this.getKey(key), value, { ttl: expiry });
            this.metrics.incrementCounter('ops_total', { operation: 'set', status: 'success' });
        }
        catch (error) {
            logger_js_1.default.error({ err: error, key }, 'Cache set error');
            this.metrics.incrementCounter('ops_total', { operation: 'set', status: 'error' });
        }
    }
    /**
     * @method del
     * @description Deletes a value from the cache.
     * @param {string} key - The key of the item to delete.
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await cacheService.del('user:123');
     * ```
     */
    async del(key) {
        if (!this.enabled)
            return;
        try {
            await this.cacheManager.delete(this.getKey(key));
            this.metrics.incrementCounter('ops_total', { operation: 'del', status: 'success' });
        }
        catch (error) {
            logger_js_1.default.error({ err: error, key }, 'Cache del error');
        }
    }
    /**
     * @method invalidatePattern
     * @description Invalidates cache keys matching a given pattern.
     * @param {string} pattern - The pattern to match keys against (e.g., 'users:*').
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await cacheService.invalidatePattern('user:*');
     * ```
     */
    async invalidatePattern(pattern) {
        if (!this.enabled)
            return;
        try {
            const fullPattern = this.getKey(pattern);
            await this.cacheManager.invalidateByPattern(fullPattern);
            logger_js_1.default.info({ pattern: fullPattern }, 'Cache pattern invalidated');
        }
        catch (error) {
            logger_js_1.default.error({ err: error, pattern }, 'Cache pattern invalidation error');
        }
    }
    /**
     * @method getOrSet
     * @description A helper function that attempts to get a value from the cache and,
     * if it's not present, calls a factory function to generate the value,
     * sets it in the cache, and then returns it.
     * @template T
     * @param {string} key - The cache key.
     * @param {() => Promise<T>} factory - A function that returns a promise resolving to the value to be cached.
     * @param {number} [ttl] - Optional TTL in seconds for the new cache entry.
     * @returns {Promise<T>} The cached or newly generated value.
     *
     * @example
     * ```typescript
     * const user = await cacheService.getOrSet('user:123', () => findUserInDb('123'), 3600);
     * ```
     */
    async getOrSet(key, factory, ttl) {
        // cacheManager.getOrSet signature matches what we need
        // but we need to handle the namespacing of the key
        return this.cacheManager.getOrSet(this.getKey(key), factory, { ttl: ttl || this.defaultTtl });
    }
}
exports.CacheService = CacheService;
/**
 * @const cacheService
 * @description A singleton instance of the CacheService.
 */
exports.cacheService = new CacheService();
