/**
 * Database operation wrappers with integrated resilience patterns
 */

import pino from 'pino';
import {
  DatabaseError,
  toAppError,
} from './errors.js';
import {
  executeWithRetry,
  executeWithTimeout,
  RetryPolicies,
  withGracefulDegradation,
} from './resilience.js';

const logger = pino({ name: 'DatabaseResilience' });

/**
 * Execute Neo4j query with retry and timeout
 */
export async function executeNeo4jQuery<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    timeoutMs?: number;
    retryable?: boolean;
  },
): Promise<T> {
  const timeoutMs = options?.timeoutMs || 30000;
  const retryable = options?.retryable !== false;

  try {
    const fnWithTimeout = () =>
      executeWithTimeout(fn, timeoutMs, `neo4j.${operation}`);

    if (retryable) {
      return await executeWithRetry(fnWithTimeout, RetryPolicies.database, {
        operation,
        service: 'neo4j',
      });
    }

    return await fnWithTimeout();
  } catch (error: any) {
    logger.error(
      {
        operation,
        error: error instanceof Error ? error.message : String(error),
      },
      'Neo4j query failed',
    );

    throw new DatabaseError(
      'NEO4J_ERROR',
      `Neo4j ${operation} failed: ${error.message}`,
      { operation },
      error,
    );
  }
}

/**
 * Execute PostgreSQL query with retry and timeout
 */
export async function executePostgresQuery<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    timeoutMs?: number;
    retryable?: boolean;
  },
): Promise<T> {
  const timeoutMs = options?.timeoutMs || 10000;
  const retryable = options?.retryable !== false;

  try {
    const fnWithTimeout = () =>
      executeWithTimeout(fn, timeoutMs, `postgres.${operation}`);

    if (retryable) {
      return await executeWithRetry(fnWithTimeout, RetryPolicies.database, {
        operation,
        service: 'postgres',
      });
    }

    return await fnWithTimeout();
  } catch (error: any) {
    logger.error(
      {
        operation,
        error: error instanceof Error ? error.message : String(error),
      },
      'PostgreSQL query failed',
    );

    throw new DatabaseError(
      'POSTGRES_ERROR',
      `PostgreSQL ${operation} failed: ${error.message}`,
      { operation },
      error,
    );
  }
}

/**
 * Execute Redis operation with graceful degradation
 * Redis failures should not break the application
 */
export async function executeRedisOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  return withGracefulDegradation(fn, fallback, {
    serviceName: 'redis',
    operation,
    logError: true,
  });
}

/**
 * Database transaction wrapper with rollback on error
 */
export async function withDatabaseTransaction<T>(
  beginFn: () => Promise<void>,
  commitFn: () => Promise<void>,
  rollbackFn: () => Promise<void>,
  transactionFn: () => Promise<T>,
): Promise<T> {
  try {
    await beginFn();
    const result = await transactionFn();
    await commitFn();
    return result;
  } catch (error: any) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Transaction failed, rolling back',
    );

    try {
      await rollbackFn();
    } catch (rollbackError: any) {
      logger.error(
        {
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        },
        'Transaction rollback failed',
      );
    }

    throw toAppError(error);
  }
}

/**
 * Batch operation with partial failure handling
 */
export async function executeBatchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options?: {
    continueOnError?: boolean;
    batchSize?: number;
  },
): Promise<{
  results: R[];
  errors: Array<{ item: T; error: Error }>;
}> {
  const continueOnError = options?.continueOnError !== false;
  const batchSize = options?.batchSize || items.length;

  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchPromises = batch.map(async (item) => {
      try {
        const result = await operation(item);
        results.push(result);
        return { success: true, result };
      } catch (error: any) {
        const appError = toAppError(error);
        errors.push({ item, error: appError });

        if (!continueOnError) {
          throw appError;
        }

        return { success: false, error: appError };
      }
    });

    await Promise.all(batchPromises);
  }

  if (errors.length > 0) {
    logger.warn(
      {
        total: items.length,
        successful: results.length,
        failed: errors.length,
      },
      'Batch operation completed with errors',
    );
  }

  return { results, errors };
}
