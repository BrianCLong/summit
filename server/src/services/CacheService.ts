import { getCacheManager } from '../cache/factory.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import { cfg } from '../config.js';
import logger from '../config/logger.js';
import CacheManager from '../cache/AdvancedCachingStrategy.js';

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
export class CacheService {
  private metrics: PrometheusMetrics;
  private readonly namespace = 'cache';
  private defaultTtl: number;
  private enabled: boolean;
  private cacheManager: CacheManager;

  /**
   * @constructor
   * @description Initializes the CacheService, setting up metrics and configuration.
   */
  constructor() {
    this.metrics = new PrometheusMetrics('cache_service');
    this.metrics.createCounter('ops_total', 'Total cache operations', ['operation', 'status']);
    this.defaultTtl = cfg.CACHE_TTL_DEFAULT;
    this.enabled = cfg.CACHE_ENABLED;
    this.cacheManager = getCacheManager();
  }

  /**
   * @private
   * @method getKey
   * @description Prepends the namespace to the cache key.
   * @param {string} key - The original cache key.
   * @returns {string} The namespaced cache key.
   */
  private getKey(key: string): string {
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
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      // CacheManager handles JSON parsing internally
      const data = await this.cacheManager.get<T>(this.getKey(key));
      if (data) {
        this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'hit' });
        return data;
      }
      this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'miss' });
      return null;
    } catch (error: any) {
      logger.error({ err: error, key }, 'Cache get error');
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
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const expiry = ttl || this.defaultTtl;
      await this.cacheManager.set(this.getKey(key), value, { ttl: expiry });
      this.metrics.incrementCounter('ops_total', { operation: 'set', status: 'success' });
    } catch (error: any) {
      logger.error({ err: error, key }, 'Cache set error');
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
  async del(key: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.cacheManager.delete(this.getKey(key));
      this.metrics.incrementCounter('ops_total', { operation: 'del', status: 'success' });
    } catch (error: any) {
      logger.error({ err: error, key }, 'Cache del error');
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
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.enabled) return;

    try {
        const fullPattern = this.getKey(pattern);
        await this.cacheManager.invalidateByPattern(fullPattern);
        logger.info({ pattern: fullPattern }, 'Cache pattern invalidated');
    } catch (error: any) {
        logger.error({ err: error, pattern }, 'Cache pattern invalidation error');
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
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    // cacheManager.getOrSet signature matches what we need
    // but we need to handle the namespacing of the key
    return this.cacheManager.getOrSet(
        this.getKey(key),
        factory,
        { ttl: ttl || this.defaultTtl }
    );
  }
}

/**
 * @const cacheService
 * @description A singleton instance of the CacheService.
 */
export const cacheService = new CacheService();
