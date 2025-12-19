import { getRedisClient } from '../db/redis.js';
// @ts-ignore
import { default as pino } from 'pino';

// @ts-ignore
const logger = pino({ name: 'RedisCacheManager' });

export const CACHE_PREFIX = {
    ENTITY: 'entity',
    RELATIONSHIP: 'relationship',
    INVESTIGATION: 'investigation',
};

export class RedisCacheManager {
    private redis = getRedisClient();

    async get(prefix: string, key: string, tenantId: string): Promise<any> {
        const cacheKey = `${prefix}:${tenantId}:${key}`;
        const data = await this.redis.get(cacheKey);
        return data ? JSON.parse(data) : null;
    }

    async set(prefix: string, key: string, value: any, tenantId: string, ttl: number = 300): Promise<void> {
        const cacheKey = `${prefix}:${tenantId}:${key}`;
        await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
    }

    async delete(prefix: string, key: string, tenantId: string): Promise<void> {
        const cacheKey = `${prefix}:${tenantId}:${key}`;
        await this.redis.del(cacheKey);
    }

    async deleteByPattern(pattern: string): Promise<number> {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            return await this.redis.del(...keys);
        }
        return 0;
    }

    async invalidateGraphQLQueries(tenantId: string): Promise<void> {
        await this.deleteByPattern(`graphql:${tenantId}:*`);
    }

    async invalidateGraphMetrics(tenantId: string): Promise<void> {
        await this.deleteByPattern(`metrics:${tenantId}:*`);
    }

    getAllStats(): any {
        return {};
    }
}
