/**
 * PostgreSQL Connection Pool Instrumentation
 * Monitors pool health, connection metrics, and query performance
 */

import { Pool } from 'pg';
import {
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolWaiting,
  dbConnectionPoolSize,
  dbConnectionAcquisitionDuration,
  dbConnectionErrors,
  recordDbPoolStats,
} from './enhanced-metrics.js';
import { dbQueryDuration, dbQueriesTotal } from '../monitoring/metrics.js';
import { getTracer } from './tracer.js';
import { SpanKind } from './tracer.js';
import pino from 'pino';

const logger = pino({ name: 'postgres-instrumentation' });

/**
 * Start monitoring PostgreSQL connection pool metrics
 */
export function monitorPostgresPool(
  pool: Pool,
  poolName: string = 'default',
  intervalMs: number = 15000,
): NodeJS.Timeout {
  const monitorInterval = setInterval(() => {
    try {
      // Access pool internals (these are available in pg Pool)
      const totalCount = (pool as any).totalCount || 0;
      const idleCount = (pool as any).idleCount || 0;
      const waitingCount = (pool as any).waitingCount || 0;

      // Update metrics
      recordDbPoolStats('postgresql', poolName, {
        total: totalCount,
        active: totalCount - idleCount,
        idle: idleCount,
        waiting: waitingCount,
      });

      logger.debug(
        {
          poolName,
          total: totalCount,
          active: totalCount - idleCount,
          idle: idleCount,
          waiting: waitingCount,
        },
        'PostgreSQL pool stats',
      );
    } catch (error) {
      logger.error({ poolName, error: (error as Error).message }, 'Failed to collect pool stats');
    }
  }, intervalMs);

  // Allow process to exit even if interval is active
  if (typeof monitorInterval.unref === 'function') {
    monitorInterval.unref();
  }

  return monitorInterval;
}

/**
 * Instrument PostgreSQL pool with metrics and tracing
 */
export function instrumentPostgresPool(pool: Pool, poolName: string = 'default'): Pool {
  // Monitor pool events
  pool.on('error', (error, client) => {
    dbConnectionErrors.inc({
      database: 'postgresql',
      pool: poolName,
      error_type: error.name || 'Error',
    });
    logger.error({ poolName, error: error.message }, 'PostgreSQL pool error');
  });

  pool.on('connect', (client) => {
    logger.debug({ poolName }, 'New PostgreSQL client connected to pool');
  });

  pool.on('acquire', (client) => {
    logger.debug({ poolName }, 'PostgreSQL client acquired from pool');
  });

  pool.on('remove', (client) => {
    logger.debug({ poolName }, 'PostgreSQL client removed from pool');
  });

  // Start monitoring pool metrics
  monitorPostgresPool(pool, poolName);

  // Wrap query method with metrics and tracing
  const originalQuery = pool.query.bind(pool);

  pool.query = async function (queryTextOrConfig: any, values?: any, callback?: any) {
    const queryText =
      typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text;
    const operation = extractOperationType(queryText);
    const startTime = Date.now();
    const tracer = getTracer();

    // Measure connection acquisition time
    const acquireStart = Date.now();
    let connectionAcquired = false;

    try {
      // Trace the database query
      return await tracer.withSpan(
        `db.postgresql.${operation}`,
        async (span) => {
          span.setAttributes({
            'db.system': 'postgresql',
            'db.operation': operation,
            'db.statement': queryText.length > 500 ? queryText.substring(0, 500) + '...' : queryText,
            'db.pool': poolName,
          });

          const result = await originalQuery(queryTextOrConfig, values, callback);

          // Connection was successfully acquired
          if (!connectionAcquired) {
            const acquireDuration = (Date.now() - acquireStart) / 1000;
            dbConnectionAcquisitionDuration.observe(
              { database: 'postgresql', pool: poolName },
              acquireDuration,
            );
            connectionAcquired = true;
          }

          const duration = (Date.now() - startTime) / 1000;

          // Record metrics
          dbQueryDuration.observe({ database: 'postgresql', operation }, duration);
          dbQueriesTotal.inc({ database: 'postgresql', operation, status: 'success' });

          // Add result size to span
          span.setAttribute('db.result.rows', (result as any)?.rows?.length || 0);

          return result;
        },
        { kind: SpanKind.CLIENT },
      );
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      dbQueryDuration.observe({ database: 'postgresql', operation }, duration);
      dbQueriesTotal.inc({ database: 'postgresql', operation, status: 'error' });
      dbConnectionErrors.inc({
        database: 'postgresql',
        pool: poolName,
        error_type: 'query_error',
      });

      logger.error(
        {
          poolName,
          operation,
          error: (error as Error).message,
          duration,
        },
        'PostgreSQL query failed',
      );

      throw error;
    }
  };

  return pool;
}

/**
 * Extract operation type from SQL query
 */
function extractOperationType(query: string): string {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.startsWith('select')) return 'select';
  if (normalizedQuery.startsWith('insert')) return 'insert';
  if (normalizedQuery.startsWith('update')) return 'update';
  if (normalizedQuery.startsWith('delete')) return 'delete';
  if (normalizedQuery.startsWith('create')) return 'create';
  if (normalizedQuery.startsWith('drop')) return 'drop';
  if (normalizedQuery.startsWith('alter')) return 'alter';
  if (normalizedQuery.startsWith('truncate')) return 'truncate';
  if (normalizedQuery.startsWith('begin')) return 'begin';
  if (normalizedQuery.startsWith('commit')) return 'commit';
  if (normalizedQuery.startsWith('rollback')) return 'rollback';
  if (normalizedQuery.startsWith('with')) return 'with'; // CTE

  return 'other';
}

/**
 * Get current pool statistics
 */
export function getPoolStats(pool: Pool): {
  total: number;
  active: number;
  idle: number;
  waiting: number;
} {
  const totalCount = (pool as any).totalCount || 0;
  const idleCount = (pool as any).idleCount || 0;
  const waitingCount = (pool as any).waitingCount || 0;

  return {
    total: totalCount,
    active: totalCount - idleCount,
    idle: idleCount,
    waiting: waitingCount,
  };
}
