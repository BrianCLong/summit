"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCache = void 0;
const redis_js_1 = require("../../db/redis.js");
const compression_js_1 = require("../../utils/compression.js");
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
class QueryCache {
    cachePrefix = 'graph:query_result';
    defaultTTL = 300; // 5 minutes
    generateStrategy(analysis, context) {
        if (analysis.isWrite) {
            return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
        }
        if (context.cacheEnabled === false) {
            return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
        }
        let ttl = this.defaultTTL;
        if (analysis.complexity < 10)
            ttl = 1800; // 30 mins
        if (analysis.aggregationCount > 0)
            ttl = 600; // 10 mins
        const keyPattern = `${this.cachePrefix}:${context.tenantId}:${context.queryType}`;
        const invalidationRules = analysis.affectedLabels.map(l => `${l}:*`);
        return {
            enabled: true,
            ttl,
            keyPattern,
            invalidationRules,
            partitionKeys: ['tenantId']
        };
    }
    async get(key) {
        try {
            const redis = (0, redis_js_1.getRedisClient)();
            const cached = await redis.get(key);
            if (cached) {
                return compression_js_1.CompressionUtils.decompressFromString(cached);
            }
        }
        catch (error) {
            logger.warn('Cache read failed', error);
        }
        return null;
    }
    async set(key, value, ttl) {
        try {
            const redis = (0, redis_js_1.getRedisClient)();
            const compressed = await compression_js_1.CompressionUtils.compressToString(value);
            await redis.set(key, compressed, 'EX', ttl);
        }
        catch (error) {
            logger.warn('Cache write failed', error);
        }
    }
    generateKey(query, params, context) {
        const hash = crypto_1.default.createHash('sha256')
            .update(query + JSON.stringify(params))
            .digest('hex');
        return `${this.cachePrefix}:${context.tenantId}:${hash}`;
    }
    async invalidate(tenantId, labels) {
        const redis = (0, redis_js_1.getRedisClient)();
        const pattern = `${this.cachePrefix}:${tenantId}:*`;
        const stream = redis.scanStream({ match: pattern, count: 100 });
        stream.on('data', (keys) => {
            if (keys.length)
                redis.del(...keys);
        });
    }
}
exports.QueryCache = QueryCache;
