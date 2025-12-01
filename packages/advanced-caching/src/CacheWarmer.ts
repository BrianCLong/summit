import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { CronJob } from 'cron';
import { MultiTierCache } from './MultiTierCache';
import { WarmingStrategy, CacheOptions } from './types';

const logger = pino({ name: 'CacheWarmer' });
const tracer = trace.getTracer('advanced-caching');

/**
 * Proactive cache warming and preloading
 */
export class CacheWarmer {
  private strategies: Map<string, WarmingStrategy> = new Map();
  private cronJobs: Map<string, CronJob> = new Map();

  constructor(private cache: MultiTierCache) {}

  /**
   * Register a warming strategy
   */
  registerStrategy(name: string, strategy: WarmingStrategy): void {
    this.strategies.set(name, strategy);

    // Schedule if cron expression provided
    if (strategy.schedule) {
      this.scheduleWarming(name, strategy);
    }

    logger.info({ name, keyCount: strategy.keys.length }, 'Warming strategy registered');
  }

  /**
   * Warm cache immediately
   */
  async warm(strategyName: string, options?: CacheOptions): Promise<void> {
    const span = tracer.startSpan('CacheWarmer.warm');
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(`Strategy ${strategyName} not found`);
    }

    const startTime = Date.now();

    try {
      logger.info({ strategy: strategyName }, 'Starting cache warming');

      const parallel = strategy.parallel || 10;
      const keys = [...strategy.keys];
      const results = {
        success: 0,
        failed: 0,
        total: keys.length,
      };

      // Process in batches
      for (let i = 0; i < keys.length; i += parallel) {
        const batch = keys.slice(i, i + parallel);

        await Promise.allSettled(
          batch.map(async (key) => {
            try {
              const value = await strategy.loader(key);
              await this.cache.set(key, value, options);
              results.success++;
              logger.debug({ key }, 'Cache warmed');
            } catch (error) {
              results.failed++;
              logger.error({ key, error }, 'Cache warming failed');
            }
          })
        );
      }

      const duration = Date.now() - startTime;

      span.setAttributes({
        'strategy': strategyName,
        'keys.total': results.total,
        'keys.success': results.success,
        'keys.failed': results.failed,
        'duration': duration,
      });

      logger.info(
        {
          strategy: strategyName,
          ...results,
          duration,
        },
        'Cache warming completed'
      );
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ strategy: strategyName, error }, 'Cache warming error');
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Schedule periodic cache warming
   */
  private scheduleWarming(name: string, strategy: WarmingStrategy): void {
    if (!strategy.schedule) return;

    const job = new CronJob(
      strategy.schedule,
      async () => {
        try {
          await this.warm(name);
        } catch (error) {
          logger.error({ name, error }, 'Scheduled warming failed');
        }
      },
      null,
      true
    );

    this.cronJobs.set(name, job);
    logger.info({ name, schedule: strategy.schedule }, 'Warming scheduled');
  }

  /**
   * Warm specific keys
   */
  async warmKeys(
    keys: string[],
    loader: (key: string) => Promise<any>,
    options?: CacheOptions
  ): Promise<void> {
    const span = tracer.startSpan('CacheWarmer.warmKeys');

    try {
      await Promise.all(
        keys.map(async (key) => {
          try {
            const value = await loader(key);
            await this.cache.set(key, value, options);
          } catch (error) {
            logger.error({ key, error }, 'Key warming failed');
          }
        })
      );

      span.setAttribute('keys.count', keys.length);
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Preload cache from database query
   */
  async preloadFromQuery<T>(
    query: () => Promise<T[]>,
    keyExtractor: (item: T) => string,
    options?: CacheOptions
  ): Promise<void> {
    const span = tracer.startSpan('CacheWarmer.preloadFromQuery');

    try {
      const items = await query();

      await Promise.all(
        items.map(async (item) => {
          const key = keyExtractor(item);
          await this.cache.set(key, item, options);
        })
      );

      span.setAttribute('items.count', items.length);
      logger.info({ count: items.length }, 'Cache preloaded from query');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    for (const [name, job] of this.cronJobs.entries()) {
      job.stop();
      logger.info({ name }, 'Warming job stopped');
    }
    this.cronJobs.clear();
  }

  /**
   * Stop specific strategy
   */
  stopStrategy(name: string): void {
    const job = this.cronJobs.get(name);
    if (job) {
      job.stop();
      this.cronJobs.delete(name);
      logger.info({ name }, 'Warming job stopped');
    }
  }

  /**
   * Get warming statistics
   */
  getStats() {
    return {
      strategies: this.strategies.size,
      scheduledJobs: this.cronJobs.size,
      strategyDetails: Array.from(this.strategies.entries()).map(
        ([name, strategy]) => ({
          name,
          keyCount: strategy.keys.length,
          scheduled: !!strategy.schedule,
          priority: strategy.priority,
        })
      ),
    };
  }
}
