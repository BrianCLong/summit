import DataLoader from 'dataloader';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { LoaderOptions } from './types';

const logger = pino({ name: 'AggregateLoader' });
const tracer = trace.getTracer('graphql-dataloader');

export interface AggregateResult {
  count?: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
}

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
export function createAggregateLoader<K>(
  batchFn: (keys: readonly K[]) => Promise<AggregateResult[]>,
  options?: LoaderOptions<K, AggregateResult>
): DataLoader<K, AggregateResult> {
  const instrumentedBatchFn = async (keys: readonly K[]): Promise<(AggregateResult | Error)[]> => {
    const span = tracer.startSpan('AggregateLoader.batchLoad');

    try {
      span.setAttribute('batch.size', keys.length);
      const startTime = Date.now();

      const results = await batchFn(keys);

      const duration = Date.now() - startTime;
      span.setAttribute('batch.duration', duration);

      logger.debug(
        { keyCount: keys.length, duration },
        'Aggregate batch load completed'
      );

      return results;
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ error, keyCount: keys.length }, 'Aggregate batch load failed');
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
