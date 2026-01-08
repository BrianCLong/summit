
import { RedisService } from './redis.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

export interface ProbabilisticCacheConfig {
    enabled: boolean;
    ttlSeconds: number; // TTL for the negative cache
    falsePositiveRate?: number; // Not used for simple negative cache, but useful for Bloom
}

export class ProbabilisticCache {
    private redis: RedisService;
    private config: ProbabilisticCacheConfig;
    private prefix = 'neg_cache:';

    constructor(config: Partial<ProbabilisticCacheConfig> = {}) {
        this.redis = RedisService.getInstance();
        this.config = {
            enabled: config.enabled ?? false, // Defaults to OFF
            ttlSeconds: config.ttlSeconds ?? 60,
            ...config
        };
    }

    /**
     * Mark a key as "missing" in the underlying data store.
     * This prevents hammering the DB for a key that we know doesn't exist.
     */
    async markMissing(key: string): Promise<void> {
        if (!this.config.enabled) return;

        const cacheKey = this.prefix + this.hashKey(key);
        try {
            await this.redis.set(cacheKey, '1', this.config.ttlSeconds);
        } catch (e: any) {
            logger.warn('Failed to set negative cache', e);
        }
    }

    /**
     * Check if a key is known to be missing.
     * Returns true if we should skip the DB lookup.
     */
    async isKnownMissing(key: string): Promise<boolean> {
        if (!this.config.enabled) return false;

        const cacheKey = this.prefix + this.hashKey(key);
        try {
            const val = await this.redis.get(cacheKey);
            return val === '1';
        } catch (e: any) {
            logger.warn('Failed to check negative cache', e);
            return false;
        }
    }

    /**
     * Clear knowledge about a missing key (e.g. after an INSERT).
     */
    async clearMissing(key: string): Promise<void> {
        if (!this.config.enabled) return;

        const cacheKey = this.prefix + this.hashKey(key);
        try {
            await this.redis.del(cacheKey);
        } catch (e: any) {
             logger.warn('Failed to clear negative cache', e);
        }
    }

    private hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex');
    }
}
