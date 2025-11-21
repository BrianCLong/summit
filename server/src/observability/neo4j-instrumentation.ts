/**
 * Neo4j Driver Instrumentation
 * Monitors Neo4j sessions, transactions, and query performance
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import {
  neo4jSessionsActive,
  neo4jTransactionDuration,
  neo4jResultSize,
} from './enhanced-metrics.js';
import {
  neo4jQueryTotal,
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
} from '../metrics/neo4jMetrics.js';
import { getTracer } from './tracer.js';
import { SpanKind } from './tracer.js';
import pino from 'pino';

const logger = pino({ name: 'neo4j-instrumentation' });

// Track active sessions
let activeSessionCount = 0;

/**
 * Instrument Neo4j driver with observability
 */
export function instrumentNeo4jDriver(driver: Driver): Driver {
  // Wrap session creation
  const originalSession = driver.session.bind(driver);

  (driver as any).session = function (config?: any): Session {
    const session = originalSession(config);
    const mode = config?.defaultAccessMode === neo4j.session.WRITE ? 'write' : 'read';

    // Track session lifecycle
    activeSessionCount++;
    neo4jSessionsActive.set(activeSessionCount);

    logger.debug({ mode, activeSessions: activeSessionCount }, 'Neo4j session created');

    // Wrap session close
    const originalClose = session.close.bind(session);
    session.close = async function () {
      activeSessionCount--;
      neo4jSessionsActive.set(activeSessionCount);
      logger.debug({ mode, activeSessions: activeSessionCount }, 'Neo4j session closed');
      return originalClose();
    };

    // Wrap session run method with metrics
    const originalRun = session.run.bind(session);
    session.run = async function (query: string, parameters?: any) {
      const operation = extractCypherOperation(query);
      const startTime = Date.now();
      const tracer = getTracer();

      return tracer.withSpan(
        `db.neo4j.${operation}`,
        async (span) => {
          span.setAttributes({
            'db.system': 'neo4j',
            'db.operation': operation,
            'db.statement': query.length > 500 ? query.substring(0, 500) + '...' : query,
            'db.neo4j.access_mode': mode,
          });

          try {
            const result = await originalRun(query, parameters);
            const duration = Date.now() - startTime;

            // Record metrics
            neo4jQueryTotal.inc({ operation, label: 'success' });
            neo4jQueryLatencyMs.observe({ operation, label: 'success' }, duration);

            // Count records
            const records = await result.records;
            const recordCount = Array.isArray(records) ? records.length : 0;

            neo4jResultSize.observe({ operation }, recordCount);
            span.setAttribute('db.neo4j.result_count', recordCount);

            logger.debug(
              {
                operation,
                duration,
                recordCount,
              },
              'Neo4j query completed',
            );

            return { ...result, records };
          } catch (error) {
            const duration = Date.now() - startTime;

            neo4jQueryErrorsTotal.inc({ operation, label: 'error' });
            neo4jQueryLatencyMs.observe({ operation, label: 'error' }, duration);

            logger.error(
              {
                operation,
                duration,
                error: (error as Error).message,
              },
              'Neo4j query failed',
            );

            throw error;
          }
        },
        { kind: SpanKind.CLIENT },
      );
    };

    // Wrap transaction methods
    wrapTransactionMethods(session, mode);

    return session;
  };

  return driver;
}

/**
 * Wrap transaction methods with metrics
 */
function wrapTransactionMethods(session: Session, mode: string): void {
  // Wrap readTransaction
  const originalReadTransaction = session.readTransaction?.bind(session);
  if (originalReadTransaction) {
    session.readTransaction = async function (transactionWork: any) {
      const startTime = Date.now();
      try {
        const result = await originalReadTransaction(transactionWork);
        const duration = (Date.now() - startTime) / 1000;
        neo4jTransactionDuration.observe({ mode: 'read' }, duration);
        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        neo4jTransactionDuration.observe({ mode: 'read' }, duration);
        throw error;
      }
    };
  }

  // Wrap writeTransaction
  const originalWriteTransaction = session.writeTransaction?.bind(session);
  if (originalWriteTransaction) {
    session.writeTransaction = async function (transactionWork: any) {
      const startTime = Date.now();
      try {
        const result = await originalWriteTransaction(transactionWork);
        const duration = (Date.now() - startTime) / 1000;
        neo4jTransactionDuration.observe({ mode: 'write' }, duration);
        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        neo4jTransactionDuration.observe({ mode: 'write' }, duration);
        throw error;
      }
    };
  }
}

/**
 * Extract operation type from Cypher query
 */
function extractCypherOperation(query: string): string {
  const normalizedQuery = query.trim().toLowerCase();

  // Match patterns
  if (normalizedQuery.startsWith('match')) return 'match';
  if (normalizedQuery.startsWith('create')) return 'create';
  if (normalizedQuery.startsWith('merge')) return 'merge';
  if (normalizedQuery.startsWith('delete')) return 'delete';
  if (normalizedQuery.startsWith('remove')) return 'remove';
  if (normalizedQuery.startsWith('set')) return 'set';
  if (normalizedQuery.includes('call db.index')) return 'index';
  if (normalizedQuery.startsWith('call')) return 'procedure';
  if (normalizedQuery.startsWith('with')) return 'with';
  if (normalizedQuery.startsWith('unwind')) return 'unwind';
  if (normalizedQuery.startsWith('return')) return 'return';

  // Check for multi-clause queries
  if (normalizedQuery.includes('create') && normalizedQuery.includes('match')) {
    return 'match_create';
  }
  if (normalizedQuery.includes('merge') && normalizedQuery.includes('match')) {
    return 'match_merge';
  }

  return 'other';
}

/**
 * Get Neo4j driver statistics
 */
export function getNeo4jStats(): {
  activeSessions: number;
} {
  return {
    activeSessions: activeSessionCount,
  };
}

/**
 * Reset session counter (useful for testing)
 */
export function resetNeo4jStats(): void {
  activeSessionCount = 0;
  neo4jSessionsActive.set(0);
}
