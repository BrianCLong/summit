"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowTrafficMiddleware = exports.clearShadowCache = exports.getShadowConfig = void 0;
const ShadowService_js_1 = require("../services/ShadowService.js");
const postgres_js_1 = require("../db/postgres.js");
const lru_cache_1 = require("lru-cache");
const configCache = new lru_cache_1.LRUCache({
    max: 1000,
    ttl: 60 * 1000, // 1 minute
});
const getShadowConfig = async (tenantId) => {
    if (configCache.has(tenantId)) {
        return configCache.get(tenantId);
    }
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query('SELECT target_url as "targetUrl", sampling_rate as "samplingRate", compare_responses as "compareResponses" FROM shadow_traffic_configs WHERE tenant_id = $1', [tenantId]);
        const config = result.rows.length > 0 ? result.rows[0] : undefined;
        if (config) {
            configCache.set(tenantId, config);
        }
        return config;
    }
    catch (error) {
        // Fallback for bootstrap or if table doesn't exist yet
        if (error.message.includes('relation "shadow_traffic_configs" does not exist')) {
            return undefined;
        }
        throw error;
    }
};
exports.getShadowConfig = getShadowConfig;
const clearShadowCache = (tenantId) => {
    configCache.delete(tenantId);
};
exports.clearShadowCache = clearShadowCache;
const shadowTrafficMiddleware = async (req, res, next) => {
    const tenantId = req.user?.tenantId || req.tenantId;
    if (!tenantId) {
        return next();
    }
    try {
        const config = await (0, exports.getShadowConfig)(tenantId);
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
        ShadowService_js_1.shadowService.shadow({
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body
        }, config);
    }
    catch (error) {
        console.error('[ShadowTrafficMiddleware] Error:', error);
    }
    next();
};
exports.shadowTrafficMiddleware = shadowTrafficMiddleware;
