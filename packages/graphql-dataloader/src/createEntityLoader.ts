import DataLoader from 'dataloader';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { BatchLoadFn, LoaderOptions } from './types';

const logger = pino({ name: 'EntityLoader' });
const tracer = trace.getTracer('graphql-dataloader');

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
export function createEntityLoader<K, V>(
  batchFn: BatchLoadFn<K, V>,
  options?: LoaderOptions<K, V>
): DataLoader<K, V> {
  const instrumentedBatchFn = async (keys: readonly K[]): Promise<(V | Error)[]> => {
    const span = tracer.startSpan('EntityLoader.batchLoad');

    try {
      span.setAttribute('batch.size', keys.length);
      const startTime = Date.now();

      const results = await batchFn(keys);

      const duration = Date.now() - startTime;
      span.setAttribute('batch.duration', duration);

      logger.debug(
        { keyCount: keys.length, duration },
        'Batch load completed'
      );

      return results;
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ error, keyCount: keys.length }, 'Batch load failed');
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
    cacheMap: options?.cacheMap,
  });
}
