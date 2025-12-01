import DataLoader from 'dataloader';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { LoaderOptions } from './types';

const logger = pino({ name: 'RelationshipLoader' });
const tracer = trace.getTracer('graphql-dataloader');

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
export function createRelationshipLoader<K, V>(
  batchFn: (keys: readonly K[]) => Promise<V[][]>,
  options?: LoaderOptions<K, V[]>
): DataLoader<K, V[]> {
  const instrumentedBatchFn = async (keys: readonly K[]): Promise<(V[] | Error)[]> => {
    const span = tracer.startSpan('RelationshipLoader.batchLoad');

    try {
      span.setAttribute('batch.size', keys.length);
      const startTime = Date.now();

      const results = await batchFn(keys);

      // Ensure we return an array for each key
      const normalized = results.map((result) => result || []);

      const duration = Date.now() - startTime;
      span.setAttribute('batch.duration', duration);

      logger.debug(
        {
          keyCount: keys.length,
          totalRelations: normalized.reduce((sum, arr) => sum + arr.length, 0),
          duration,
        },
        'Relationship batch load completed'
      );

      return normalized;
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ error, keyCount: keys.length }, 'Relationship batch load failed');
      throw error;
    } finally {
      span.end();
    }
  };

  return new DataLoader(instrumentedBatchFn, {
    cache: options?.cache !== false,
    maxBatchSize: options?.maxBatchSize || 100,
    batchScheduleFn: options?.batchScheduleFn || ((callback) => process.nextTick(callback)),
    cacheKeyFn: options?.cacheKeyFn,
  });
}
