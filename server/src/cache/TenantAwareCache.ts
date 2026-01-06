
import { DistributedCacheService } from './DistributedCacheService.js';
import { DataEnvelope } from '../types/data-envelope.js';
import logger from '../utils/logger.js';

export class TenantAwareCache {
  private cache: DistributedCacheService;
  private tenantId: string;

  constructor(cache: DistributedCacheService, tenantId: string) {
    this.cache = cache;
    this.tenantId = tenantId;
  }

  private buildKey(key: string): string {
    return `tenant:${this.tenantId}:${key}`;
  }

  async get<T>(key: string): Promise<DataEnvelope<T | null>> {
    const namespacedKey = this.buildKey(key);
    return this.cache.get<T>(namespacedKey);
  }

  async set<T>(
    key: string,
    value: T,
    options: {
      ttlSeconds?: number;
      tags?: string[];
      strategy?: 'cache-aside' | 'write-through' | 'write-behind';
    } = {}
  ): Promise<DataEnvelope<boolean>> {
    const namespacedKey = this.buildKey(key);
    // Add tenant tag automatically
    const tags = options.tags ? [...options.tags] : [];
    tags.push(`tenant:${this.tenantId}`);

    return this.cache.set<T>(namespacedKey, value, { ...options, tags });
  }

  async delete(key: string): Promise<DataEnvelope<boolean>> {
    const namespacedKey = this.buildKey(key);
    return this.cache.delete(namespacedKey);
  }

  async deleteByTag(tag: string): Promise<DataEnvelope<number>> {
    // We can't easily namespace arbitrary tags in deleteByTag without changing the underlying service
    // to index tags with tenant ID.
    // However, if we convention tags as "tenant:{id}:{tag}", we can.
    // For now, let's assume tags passed here are NOT global but specific to the logic,
    // so we might want to namespace them if possible, but DistributedCacheService manages tags globally.
    // The safest is to rely on the underlying service's tag support, but we added a tenant tag on set.

    // If we want to delete ALL cache for this tenant:
    if (tag === 'all') {
      return this.cache.deleteByTag(`tenant:${this.tenantId}`);
    }

    // Otherwise, we might need a better strategy for namespaced tags in the underlying service.
    // For now, just pass through, assuming the caller knows what they are doing or we append tenant id.
    // Let's append tenant id to the tag to ensure isolation.
    return this.cache.deleteByTag(`tenant:${this.tenantId}:${tag}`);
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttlSeconds?: number;
      tags?: string[];
      forceRefresh?: boolean;
    } = {}
  ): Promise<DataEnvelope<T>> {
    const namespacedKey = this.buildKey(key);
    const tags = options.tags ? [...options.tags] : [];
    tags.push(`tenant:${this.tenantId}`);

    return this.cache.getOrSet<T>(namespacedKey, fetcher, { ...options, tags });
  }
}
