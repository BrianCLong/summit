import { Redis } from 'ioredis';
import { Mutex } from 'async-mutex';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { StampedeConfig } from './types';

const logger = pino({ name: 'StampedeProtection' });
const tracer = trace.getTracer('advanced-caching');

/**
 * Prevents cache stampede using distributed locks
 */
export class StampedeProtection {
  private localLocks: Map<string, Mutex> = new Map();

  constructor(
    private redis: Redis,
    private config: StampedeConfig
  ) {}

  /**
   * Execute function with stampede protection
   * Only one process/thread will execute the loader, others will wait
   */
  async execute<T>(
    key: string,
    loader: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('StampedeProtection.execute');
    const lockKey = `lock:${key}`;

    try {
      // Try to acquire distributed lock
      const lockAcquired = await this.acquireLock(lockKey);

      if (lockAcquired) {
        span.setAttribute('lock.acquired', true);
        logger.debug({ key }, 'Lock acquired, executing loader');

        try {
          // Execute the loader
          const result = await loader();

          // Release lock
          await this.releaseLock(lockKey);

          return result;
        } catch (error) {
          await this.releaseLock(lockKey);
          throw error;
        }
      } else {
        span.setAttribute('lock.acquired', false);
        logger.debug({ key }, 'Lock not acquired, waiting...');

        // Wait and retry
        return await this.waitForValue(key, loader);
      }
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Acquire distributed lock using Redis
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    const result = await this.redis.set(
      lockKey,
      '1',
      'PX',
      this.config.lockTTL,
      'NX'
    );

    return result === 'OK';
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  /**
   * Wait for another process to populate the value
   */
  private async waitForValue<T>(
    key: string,
    loader: () => Promise<T>
  ): Promise<T> {
    const lockKey = `lock:${key}`;

    for (let i = 0; i < this.config.maxRetries; i++) {
      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.lockRetryDelay)
      );

      // Check if lock is released
      const lockExists = await this.redis.exists(lockKey);

      if (!lockExists) {
        // Lock released, try to get the value from cache or acquire lock
        const lockAcquired = await this.acquireLock(lockKey);

        if (lockAcquired) {
          try {
            const result = await loader();
            await this.releaseLock(lockKey);
            return result;
          } catch (error) {
            await this.releaseLock(lockKey);
            throw error;
          }
        }
      }
    }

    // Timeout: execute anyway (fallback)
    logger.warn({ key }, 'Stampede protection timeout, executing anyway');
    return await loader();
  }

  /**
   * Get local mutex for in-process synchronization
   */
  private getLocalMutex(key: string): Mutex {
    if (!this.localLocks.has(key)) {
      this.localLocks.set(key, new Mutex());
    }
    return this.localLocks.get(key)!;
  }

  /**
   * Execute with local mutex (for single-process stampede prevention)
   */
  async executeLocal<T>(
    key: string,
    loader: () => Promise<T>
  ): Promise<T> {
    const mutex = this.getLocalMutex(key);
    const release = await mutex.acquire();

    try {
      return await loader();
    } finally {
      release();
    }
  }

  /**
   * Clean up expired local locks
   */
  cleanup(): void {
    this.localLocks.clear();
  }
}
