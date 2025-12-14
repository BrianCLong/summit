import { withCache } from '../utils/cacheHelper.js';
import logger from '../utils/logger.js';

export class Neo4jCacheService {
    /**
     * Caches a generic Neo4j query result.
     * @param key Unique cache key (include tenantId, params)
     * @param ttlSeconds Time to live in seconds
     * @param queryFn Async function that executes the Cypher query
     */
    static async getCachedResult<T>(
        key: string,
        ttlSeconds: number,
        queryFn: () => Promise<T>
    ): Promise<T> {
        try {
            return await withCache(key, ttlSeconds, queryFn);
        } catch (error) {
            logger.error(`Cache failed for key ${key}, falling back to direct query`, error);
            return queryFn();
        }
    }

    /**
     * Generates a standardized cache key for graph queries
     */
    static generateKey(prefix: string, tenantId: string, params: Record<string, any>): string {
        const paramStr = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('_');
        return `graph:${prefix}:${tenantId}:${paramStr}`;
    }
}
