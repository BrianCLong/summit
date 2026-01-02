import { getCacheManager } from '../cache/factory.js';
import { default as pino } from 'pino';

const logger = (pino as any)({ name: 'RedisCacheManager' });

export const CACHE_PREFIX = {
    ENTITY: 'entity',
    RELATIONSHIP: 'relationship',
    INVESTIGATION: 'investigation',
};

/**
 * Adapter class to maintain backward compatibility with the old RedisCacheManager
 * while leveraging the new AdvancedCachingStrategy.
 */
export class RedisCacheManager {
    private cacheManager = getCacheManager();

    private getFullKey(prefix: string, key: string, tenantId: string): string {
        // The CacheManager applies its own prefix (summit:cache:), so we just provide the rest
        return `${prefix}:${tenantId}:${key}`;
    }

    async get(prefix: string, key: string, tenantId: string): Promise<any> {
        const cacheKey = this.getFullKey(prefix, key, tenantId);
        try {
            return await this.cacheManager.get(cacheKey);
        } catch (error: any) {
            logger.error({ error, key: cacheKey }, 'Error getting from cache');
            return null;
        }
    }

    async set(prefix: string, key: string, value: any, tenantId: string, ttl: number = 300): Promise<void> {
        const cacheKey = this.getFullKey(prefix, key, tenantId);
        try {
            await this.cacheManager.set(cacheKey, value, { ttl });
        } catch (error: any) {
            logger.error({ error, key: cacheKey }, 'Error setting cache');
        }
    }

    async delete(prefix: string, key: string, tenantId: string): Promise<void> {
        const cacheKey = this.getFullKey(prefix, key, tenantId);
        try {
            await this.cacheManager.delete(cacheKey);
        } catch (error: any) {
            logger.error({ error, key: cacheKey }, 'Error deleting from cache');
        }
    }

    async deleteByPattern(pattern: string): Promise<number> {
        try {
            // AdvancedCachingStrategy handles pattern invalidation
            return await this.cacheManager.invalidateByPattern(pattern);
        } catch (error: any) {
            logger.error({ error, pattern }, 'Error deleting by pattern');
            return 0;
        }
    }

    async invalidateGraphQLQueries(tenantId: string): Promise<void> {
        // We match the pattern expected by the old implementation, but routed through the new manager
        await this.deleteByPattern(`graphql:${tenantId}:*`);
    }

    async invalidateGraphMetrics(tenantId: string): Promise<void> {
        await this.deleteByPattern(`metrics:${tenantId}:*`);
    }

    getAllStats(): any {
        return this.cacheManager.getMetrics();
    }
}
