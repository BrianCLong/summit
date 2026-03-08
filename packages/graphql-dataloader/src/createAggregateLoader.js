"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAggregateLoader = createAggregateLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'AggregateLoader' });
const tracer = api_1.trace.getTracer('graphql-dataloader');
/**
 * Create aggregate loader for batching count/sum/avg queries
 *
 * Example:
 * const postCountLoader = createAggregateLoader(
 *   async (userIds) => {
 *     const counts = await db.query(`
 *       SELECT user_id, COUNT(*) as count
 *       FROM posts
 *       WHERE user_id = ANY($1)
 *       GROUP BY user_id
 *     `, [userIds]);
 *     return userIds.map(id => {
 *       const result = counts.find(c => c.user_id === id);
 *       return { count: result?.count || 0 };
 *     });
 *   }
 * );
 */
function createAggregateLoader(batchFn, options) {
    const instrumentedBatchFn = async (keys) => {
        const span = tracer.startSpan('AggregateLoader.batchLoad');
        try {
            span.setAttribute('batch.size', keys.length);
            const startTime = Date.now();
            const results = await batchFn(keys);
            const duration = Date.now() - startTime;
            span.setAttribute('batch.duration', duration);
            logger.debug({ keyCount: keys.length, duration }, 'Aggregate batch load completed');
            return results;
        }
        catch (error) {
            span.recordException(error);
            logger.error({ error, keyCount: keys.length }, 'Aggregate batch load failed');
            throw error;
        }
        finally {
            span.end();
        }
    };
    return new dataloader_1.default(instrumentedBatchFn, {
        cache: options?.cache !== false,
        maxBatchSize: options?.maxBatchSize || 100,
        batchScheduleFn: options?.batchScheduleFn || ((callback) => process.nextTick(callback)),
        cacheKeyFn: options?.cacheKeyFn,
    });
}
