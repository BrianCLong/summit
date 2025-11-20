/**
 * Redis Instrumentation
 * Wraps Redis operations with metrics and tracing
 */

import { Redis } from 'ioredis';
import {
  redisCacheHits,
  redisCacheMisses,
  redisOperationDuration,
  redisConnectionsActive,
  redisCommandsTotal,
  updateCacheHitRatio,
} from './enhanced-metrics.js';
import { getTracer } from './tracer.js';
import pino from 'pino';

const logger = pino({ name: 'redis-instrumentation' });

// Track cache hits/misses for ratio calculation
const cacheStats = new Map<string, { hits: number; misses: number }>();

/**
 * Instrument a Redis client with observability
 */
export function instrumentRedisClient(client: Redis, clientType: string = 'default'): Redis {
  // Track connection status
  client.on('connect', () => {
    redisConnectionsActive.inc({ client_type: clientType });
    logger.info({ clientType }, 'Redis client connected');
  });

  client.on('close', () => {
    redisConnectionsActive.dec({ client_type: clientType });
    logger.info({ clientType }, 'Redis client disconnected');
  });

  client.on('error', (error) => {
    logger.error({ clientType, error: error.message }, 'Redis client error');
  });

  // Wrap command execution with metrics
  const originalSendCommand = client.sendCommand.bind(client);
  client.sendCommand = async function (command: any, ...args: any[]) {
    const commandName = command?.name?.toLowerCase() || 'unknown';
    const startTime = Date.now();
    const tracer = getTracer();

    try {
      // Trace Redis operation
      const result = await tracer.traceCacheOperation(
        commandName,
        command?.args?.[0] || 'unknown',
        async () => {
          return originalSendCommand(command, ...args);
        },
      );

      const duration = (Date.now() - startTime) / 1000;

      // Record metrics
      redisOperationDuration.observe({ operation: commandName, status: 'success' }, duration);
      redisCommandsTotal.inc({ command: commandName, status: 'success' });

      // Track cache hits/misses for GET operations
      if (commandName === 'get') {
        const cacheName = 'default';
        const stats = cacheStats.get(cacheName) || { hits: 0, misses: 0 };

        if (result !== null && result !== undefined) {
          redisCacheHits.inc({ operation: 'get', cache_name: cacheName });
          stats.hits++;
        } else {
          redisCacheMisses.inc({ operation: 'get', cache_name: cacheName });
          stats.misses++;
        }

        cacheStats.set(cacheName, stats);
        updateCacheHitRatio(cacheName, stats.hits, stats.misses);
      }

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      redisOperationDuration.observe({ operation: commandName, status: 'error' }, duration);
      redisCommandsTotal.inc({ command: commandName, status: 'error' });

      logger.error(
        { commandName, error: (error as Error).message },
        'Redis command failed',
      );
      throw error;
    }
  };

  return client;
}

/**
 * Create instrumented Redis wrapper with high-level operations
 */
export class InstrumentedRedisCache {
  constructor(
    private client: Redis,
    private cacheName: string = 'default',
  ) {}

  async get(key: string): Promise<string | null> {
    const tracer = getTracer();
    const startTime = Date.now();

    return tracer.traceCacheOperation('get', key, async () => {
      try {
        const value = await this.client.get(key);
        const duration = (Date.now() - startTime) / 1000;

        const stats = cacheStats.get(this.cacheName) || { hits: 0, misses: 0 };

        if (value !== null) {
          redisCacheHits.inc({ operation: 'get', cache_name: this.cacheName });
          stats.hits++;
        } else {
          redisCacheMisses.inc({ operation: 'get', cache_name: this.cacheName });
          stats.misses++;
        }

        cacheStats.set(this.cacheName, stats);
        updateCacheHitRatio(this.cacheName, stats.hits, stats.misses);

        redisOperationDuration.observe({ operation: 'get', status: 'success' }, duration);
        return value;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'get', status: 'error' }, duration);
        throw error;
      }
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK' | null> {
    const tracer = getTracer();
    const startTime = Date.now();

    return tracer.traceCacheOperation('set', key, async () => {
      try {
        const result = ttl
          ? await this.client.set(key, value, 'EX', ttl)
          : await this.client.set(key, value);

        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'set', status: 'success' }, duration);
        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'set', status: 'error' }, duration);
        throw error;
      }
    });
  }

  async del(key: string): Promise<number> {
    const tracer = getTracer();
    const startTime = Date.now();

    return tracer.traceCacheOperation('del', key, async () => {
      try {
        const result = await this.client.del(key);
        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'del', status: 'success' }, duration);
        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'del', status: 'error' }, duration);
        throw error;
      }
    });
  }

  async exists(key: string): Promise<number> {
    const tracer = getTracer();
    const startTime = Date.now();

    return tracer.traceCacheOperation('exists', key, async () => {
      try {
        const result = await this.client.exists(key);
        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'exists', status: 'success' }, duration);
        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        redisOperationDuration.observe({ operation: 'exists', status: 'error' }, duration);
        throw error;
      }
    });
  }

  async ttl(key: string): Promise<number> {
    const result = await this.client.ttl(key);
    return result;
  }

  /**
   * Get cache statistics for this cache instance
   */
  getCacheStats(): { hits: number; misses: number; hitRatio: number } {
    const stats = cacheStats.get(this.cacheName) || { hits: 0, misses: 0 };
    const total = stats.hits + stats.misses;
    const hitRatio = total > 0 ? stats.hits / total : 0;

    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRatio,
    };
  }
}
