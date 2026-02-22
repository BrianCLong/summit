/**
 * Tenant-Scoped Cache Wrapper
 *
 * Prevents cache poisoning by ensuring all cache keys include tenant_id.
 * Compatible with Redis, in-memory caches, and any key-value store.
 */

import { TenantContext, MinimalTenantContext, validateTenantContext } from '../security/tenant-context.ts';
import { TenantId } from '../types/identity.ts';

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
export function generateTenantCacheKey(
  context: TenantContext | MinimalTenantContext,
  namespace: string,
  key: string
): string {
  validateTenantContext(context);
  return `tenant:${context.tenantId}:${namespace}:${key}`;
}

/**
 * Tenant-aware cache wrapper
 *
 * Automatically prefixes all keys with tenant_id to prevent cache poisoning.
 */
export class TenantCache<T = any> {
  constructor(
    private cache: any, // Redis client or any cache with get/set/del methods
    private context: TenantContext | MinimalTenantContext,
    private namespace: string,
    private defaultTTL: number = 900 // 15 minutes
  ) {
    validateTenantContext(context);
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    const tenantKey = this.buildKey(key);
    const value = await this.cache.get(tenantKey);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const tenantKey = this.buildKey(key);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultTTL;

    if (this.cache.setex) {
      await this.cache.setex(tenantKey, ttl, serialized);
    } else {
      await this.cache.set(tenantKey, serialized, 'EX', ttl);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    const tenantKey = this.buildKey(key);
    await this.cache.del(tenantKey);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const tenantKey = this.buildKey(key);
    const result = await this.cache.exists(tenantKey);
    return result > 0;
  }

  /**
   * Increment value (atomic)
   */
  async incr(key: string): Promise<number> {
    const tenantKey = this.buildKey(key);
    return await this.cache.incr(tenantKey);
  }

  /**
   * Decrement value (atomic)
   */
  async decr(key: string): Promise<number> {
    const tenantKey = this.buildKey(key);
    return await this.cache.decr(tenantKey);
  }

  /**
   * Set with expiration (alias for set)
   */
  async setWithExpiry(key: string, value: T, ttlSeconds: number): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys: string[]): Promise<(T | null)[]> {
    const tenantKeys = keys.map(k => this.buildKey(k));
    const values = await this.cache.mget(...tenantKeys);

    return values.map((v: string | null) => {
      if (!v) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  /**
   * Delete all keys matching pattern (USE WITH CAUTION)
   */
  async deletePattern(pattern: string): Promise<number> {
    const tenantPattern = this.buildKey(pattern);
    const keys = await this.cache.keys(tenantPattern);

    if (keys.length === 0) return 0;

    await this.cache.del(...keys);
    return keys.length;
  }

  /**
   * Clear all cache entries for this tenant/namespace
   */
  async clear(): Promise<number> {
    return this.deletePattern('*');
  }

  /**
   * Get tenant context
   */
  getTenantContext(): TenantContext | MinimalTenantContext {
    return this.context;
  }

  /**
   * Build tenant-scoped cache key
   */
  private buildKey(key: string): string {
    return generateTenantCacheKey(this.context, this.namespace, key);
  }
}

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
export function createTenantCache<T = any>(
  cacheClient: any,
  context: TenantContext | MinimalTenantContext,
  namespace: string,
  defaultTTL?: number
): TenantCache<T> {
  return new TenantCache<T>(cacheClient, context, namespace, defaultTTL);
}

/**
 * Extract tenant ID from a tenant-scoped cache key
 * Useful for debugging and monitoring
 */
export function extractTenantFromCacheKey(key: string): TenantId | null {
  const match = key.match(/^tenant:([^:]+):/);
  return match ? match[1] : null;
}

/**
 * Validate that a cache key is properly tenant-scoped
 * Throws error if key doesn't include tenant prefix
 */
export function validateTenantCacheKey(key: string): void {
  if (!key.startsWith('tenant:')) {
    throw new Error(
      `Cache key must be tenant-scoped (start with "tenant:"). Got: ${key.substring(0, 50)}...`
    );
  }
}
