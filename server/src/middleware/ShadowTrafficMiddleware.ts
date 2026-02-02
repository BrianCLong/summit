import { Request, Response, NextFunction } from 'express';
import { shadowService, ShadowConfig } from '../services/ShadowService.js';
import { getPostgresPool } from '../db/postgres.js';
import { LRUCache } from 'lru-cache';

const configCache = new LRUCache<string, ShadowConfig>({
    max: 1000,
    ttl: 60 * 1000, // 1 minute
});

export const getShadowConfig = async (tenantId: string): Promise<ShadowConfig | undefined> => {
    if (configCache.has(tenantId)) {
        return configCache.get(tenantId);
    }

    try {
        const pool = getPostgresPool();
        const result = await pool.query(
            'SELECT target_url as "targetUrl", sampling_rate as "samplingRate", compare_responses as "compareResponses" FROM shadow_traffic_configs WHERE tenant_id = $1',
            [tenantId]
        );

        const config = result.rows.length > 0 ? (result.rows[0] as ShadowConfig) : undefined;
        if (config) {
            configCache.set(tenantId, config);
        }
        return config;
    } catch (error: any) {
        // Fallback for bootstrap or if table doesn't exist yet
        if (error.message.includes('relation "shadow_traffic_configs" does not exist')) {
            return undefined;
        }
        throw error;
    }
};

export const clearShadowCache = (tenantId: string) => {
    configCache.delete(tenantId);
};

export const shadowTrafficMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;

    if (!tenantId) {
        return next();
    }

    try {
        const config = await getShadowConfig(tenantId);

        if (!config) {
            return next();
        }

        // Sampling check
        if (Math.random() > config.samplingRate) {
            return next();
        }

        // Identify shadow request to avoid infinite loops
        if (req.headers['x-summit-shadow-request'] === 'true') {
            return next();
        }

        shadowService.shadow({
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body
        }, config);
    } catch (error) {
        console.error('[ShadowTrafficMiddleware] Error:', error);
    }

    next();
};
