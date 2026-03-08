"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityLoader = createEntityLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'EntityLoader' });
const tracer = api_1.trace.getTracer('graphql-dataloader');
/**
 * Create entity loader for batching database queries
 *
 * Example:
 * const userLoader = createEntityLoader(
 *   async (ids) => {
 *     const users = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
 *     return ids.map(id => users.find(u => u.id === id));
 *   }
 * );
 */
function createEntityLoader(batchFn, options) {
    const instrumentedBatchFn = async (keys) => {
        const span = tracer.startSpan('EntityLoader.batchLoad');
        try {
            span.setAttribute('batch.size', keys.length);
            const startTime = Date.now();
            const results = await batchFn(keys);
            const duration = Date.now() - startTime;
            span.setAttribute('batch.duration', duration);
            logger.debug({ keyCount: keys.length, duration }, 'Batch load completed');
            return results;
        }
        catch (error) {
            span.recordException(error);
            logger.error({ error, keyCount: keys.length }, 'Batch load failed');
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
        cacheMap: options?.cacheMap,
    });
}
