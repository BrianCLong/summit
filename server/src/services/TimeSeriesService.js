"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeSeriesService = exports.TimeSeriesService = exports.TimeSeriesPointSchema = void 0;
// @ts-nocheck
const redis_js_1 = require("../db/redis.js");
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const AlertingService_js_1 = require("./AlertingService.js");
const logger = pino_1.default();
exports.TimeSeriesPointSchema = zod_1.z.object({
    metric: zod_1.z.string(),
    value: zod_1.z.number(),
    timestamp: zod_1.z.number(),
    tags: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
class TimeSeriesService {
    redis;
    retentionMs = 24 * 60 * 60 * 1000; // 24 hours default retention
    constructor() {
        this.redis = (0, redis_js_1.getRedisClient)();
    }
    /**
     * Add a data point to a time series
     */
    async addPoint(metric, value, tags = {}) {
        const timestamp = Date.now();
        const key = `ts:${metric}`;
        // Format data as JSON for the stream
        const data = JSON.stringify({ value, tags });
        try {
            // Add to Redis Stream
            // MAXLEN ~ 24h of data assuming 1 point/sec = 86400. Let's cap at 100k for safety.
            await this.redis.xadd(key, 'MAXLEN', '~', 100000, '*', 'data', data, 'ts', timestamp.toString());
            // Also update a "latest" key for quick access
            await this.redis.set(`ts:latest:${metric}`, JSON.stringify({ value, timestamp, tags }));
            // Publish to pub/sub for real-time subscribers
            await this.redis.publish(`ts:update:${metric}`, JSON.stringify({ metric, value, timestamp, tags }));
            // Check for alerts
            AlertingService_js_1.alertingService.checkAlerts(metric, value, tags).catch(err => {
                logger.error({ err, metric }, 'Error checking alerts');
            });
        }
        catch (error) {
            logger.error({ error, metric }, 'Failed to add time series point');
            throw error;
        }
    }
    /**
     * Query time series data
     */
    async query(metric, startMs, endMs) {
        const key = `ts:${metric}`;
        try {
            // XRANGE key start end
            // Redis stream IDs are timestamp-sequence. We can use timestamp as the start/end ID prefix.
            const startId = startMs.toString();
            const endId = endMs.toString();
            const results = await this.redis.xrange(key, startId, endId);
            return results.map(([id, fields]) => {
                // fields is ['data', '{"value":...}', 'ts', '123456789']
                // We need to parse the fields array.
                let dataStr = '{}';
                let tsStr = '0';
                for (let i = 0; i < fields.length; i += 2) {
                    if (fields[i] === 'data')
                        dataStr = fields[i + 1];
                    if (fields[i] === 'ts')
                        tsStr = fields[i + 1];
                }
                const data = JSON.parse(dataStr);
                const timestamp = parseInt(tsStr || id.split('-')[0]); // Use explicit ts or stream ID timestamp
                return {
                    metric,
                    value: data.value,
                    timestamp,
                    tags: data.tags
                };
            });
        }
        catch (error) {
            logger.error({ error, metric }, 'Failed to query time series data');
            return [];
        }
    }
    /**
     * Get the latest value for a metric
     */
    async getLatest(metric) {
        try {
            const data = await this.redis.get(`ts:latest:${metric}`);
            if (!data)
                return null;
            const parsed = JSON.parse(data);
            return {
                metric,
                ...parsed
            };
        }
        catch (error) {
            logger.error({ error, metric }, 'Failed to get latest time series value');
            return null;
        }
    }
}
exports.TimeSeriesService = TimeSeriesService;
exports.timeSeriesService = new TimeSeriesService();
