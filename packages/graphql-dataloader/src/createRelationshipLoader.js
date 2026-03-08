"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelationshipLoader = createRelationshipLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'RelationshipLoader' });
const tracer = api_1.trace.getTracer('graphql-dataloader');
/**
 * Create relationship loader for one-to-many associations
 *
 * Example:
 * const postsByUserLoader = createRelationshipLoader(
 *   async (userIds) => {
 *     const posts = await db.query(
 *       'SELECT * FROM posts WHERE user_id = ANY($1)',
 *       [userIds]
 *     );
 *     return userIds.map(id => posts.filter(p => p.user_id === id));
 *   }
 * );
 */
function createRelationshipLoader(batchFn, options) {
    const instrumentedBatchFn = async (keys) => {
        const span = tracer.startSpan('RelationshipLoader.batchLoad');
        try {
            span.setAttribute('batch.size', keys.length);
            const startTime = Date.now();
            const results = await batchFn(keys);
            // Ensure we return an array for each key
            const normalized = results.map((result) => result || []);
            const duration = Date.now() - startTime;
            span.setAttribute('batch.duration', duration);
            logger.debug({
                keyCount: keys.length,
                totalRelations: normalized.reduce((sum, arr) => sum + arr.length, 0),
                duration,
            }, 'Relationship batch load completed');
            return normalized;
        }
        catch (error) {
            span.recordException(error);
            logger.error({ error, keyCount: keys.length }, 'Relationship batch load failed');
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
