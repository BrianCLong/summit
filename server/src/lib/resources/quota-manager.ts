
import { getRedisClient } from '../config/database.js';
import { cfg } from '../config.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import pino from 'pino';

const logger = pino({ name: 'QuotaManager' });

export interface TenantQuota {
    limit: number;
    windowMs: number;
}

export class QuotaManager {
    private metrics: PrometheusMetrics;

    constructor() {
        this.metrics = new PrometheusMetrics('quota_manager');
        this.metrics.createCounter('quota_breach_total', 'Total quota breaches', ['tenantId', 'resource']);
    }

    async getTenantQuota(tenantId: string, resource: string): Promise<TenantQuota> {
        // In a real implementation, this would fetch from a database or cache
        // based on the tenant's tier.

        // Mock tiers
        const tier = 'starter'; // fetch from tenant service

        let limit = 100; // Default
        let windowMs = 60000;

        if (resource === 'graphql') {
            if (tier === 'starter') limit = 1000;
            if (tier === 'pro') limit = 10000;
        } else if (resource === 'ingest') {
             if (tier === 'starter') limit = 500;
        }

        return { limit, windowMs };
    }

    async checkQuota(tenantId: string, resource: string): Promise<{ allowed: boolean, remaining: number, reset: number }> {
        const quota = await this.getTenantQuota(tenantId, resource);
        const redisKey = `quota:${tenantId}:${resource}`;
        const redisClient = getRedisClient();

        if (!redisClient) {
             return { allowed: true, remaining: quota.limit, reset: Date.now() + quota.windowMs };
        }

        try {
            const script = `
                local current = redis.call("INCR", KEYS[1])
                local ttl = redis.call("PTTL", KEYS[1])
                if tonumber(current) == 1 then
                    redis.call("PEXPIRE", KEYS[1], ARGV[1])
                    ttl = ARGV[1]
                end
                return {current, ttl}
            `;
            const result = await redisClient.eval(script, 1, redisKey, quota.windowMs) as [number, number];
            const current = result[0];
            const ttl = result[1];

            const allowed = current <= quota.limit;

            if (!allowed) {
                this.metrics.incrementCounter('quota_breach_total', { tenantId, resource });
            }

            return {
                allowed,
                remaining: Math.max(0, quota.limit - current),
                reset: Date.now() + (ttl > 0 ? ttl : quota.windowMs)
            };
        } catch (e) {
            logger.error({ err: e }, 'Quota check failed');
             return { allowed: true, remaining: quota.limit, reset: Date.now() + quota.windowMs };
        }
    }
}

export const quotaManager = new QuotaManager();
