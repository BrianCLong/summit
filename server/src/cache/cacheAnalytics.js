"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectCacheAnalytics = collectCacheAnalytics;
const index_js_1 = __importDefault(require("../config/index.js"));
const database_js_1 = require("../config/database.js");
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
const warmers_js_1 = require("./warmers.js");
const responseCache_js_1 = require("./responseCache.js");
function sumMetric(metric) {
    if (!metric?.values?.length)
        return 0;
    return metric.values.reduce((acc, v) => acc + (v.value || 0), 0);
}
async function getRedisInfo() {
    const client = (0, database_js_1.getRedisClient)();
    if (!client) {
        return { connected: false, mode: 'disabled' };
    }
    try {
        const info = await client.info?.();
        const parsed = {};
        if (typeof info === 'string') {
            info.split('\n').forEach((line) => {
                const [k, v] = line.split(':');
                if (k && v)
                    parsed[k] = v.trim();
            });
        }
        return {
            connected: true,
            mode: index_js_1.default.redis.useCluster || index_js_1.default.redis.clusterNodes.length ? 'cluster' : 'single',
            usedMemory: parsed.used_memory ? Number(parsed.used_memory) : undefined,
            connectedClients: parsed.connected_clients
                ? Number(parsed.connected_clients)
                : undefined,
        };
    }
    catch (error) {
        return {
            connected: true,
            mode: index_js_1.default.redis.useCluster ? 'cluster' : 'single',
            error: error.message,
        };
    }
}
async function collectCacheAnalytics() {
    const hits = sumMetric(cacheMetrics_js_1.cacheHits.get());
    const misses = sumMetric(cacheMetrics_js_1.cacheMisses.get());
    const sets = sumMetric(cacheMetrics_js_1.cacheSets.get());
    const invalidations = sumMetric(cacheMetrics_js_1.cacheInvalidations.get());
    const localEntries = sumMetric(cacheMetrics_js_1.cacheLocalSize.get());
    const total = hits + misses;
    const hitRate = total === 0 ? 0 : hits / total;
    return {
        config: {
            cache: index_js_1.default.cache,
            cdn: index_js_1.default.cdn,
        },
        metrics: {
            hits,
            misses,
            sets,
            invalidations,
            hitRate,
            localEntries,
        },
        redis: await getRedisInfo(),
        warmers: (0, warmers_js_1.getWarmerStats)(),
        localCache: (0, responseCache_js_1.getLocalCacheStats)(),
    };
}
