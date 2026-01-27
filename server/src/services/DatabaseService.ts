import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import { PrometheusMetrics } from '../utils/metrics.js';

/**
 * @interface QueryResult
 * @description Represents the result of a database query.
 * @template T - The expected type of the rows returned.
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

/**
 * @class DatabaseService
 * @description Provides access to the PostgreSQL database with resilience and observability.
 */
export class DatabaseService {
  private circuitBreaker: CircuitBreaker;
  private metrics: PrometheusMetrics;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 10,
      resetTimeout: 30000, // 30 seconds
      p95ThresholdMs: 2000, // 2 seconds
    });
    this.metrics = new PrometheusMetrics('database_service');
    this.metrics.createCounter('queries_total', 'Total DB queries performed', ['status']);
    this.metrics.createHistogram('query_duration_ms', 'Duration of DB queries in MS');
  }

  /**
   * @method query
   * @description Executes a SQL query using the managed pool within a circuit breaker.
   */
  async query<T = any>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.circuitBreaker.execute(
      async () => {
        const startTime = Date.now();
        try {
          const pool = getPostgresPool();
          const result = await pool.query(sql, params);

          const duration = Date.now() - startTime;
          this.metrics.observeHistogram('query_duration_ms', duration);
          this.metrics.incrementCounter('queries_total', { status: 'success' });

          return {
            rows: result.rows,
            rowCount: result.rowCount
          };
        } catch (error: any) {
          this.metrics.incrementCounter('queries_total', { status: 'error' });
          logger.error('Database query error:', { sql, error: error.message });
          throw error;
        }
      }
    );
  }

  /**
   * @method getConnectionConfig
   * @description Returns the configuration for the database connection.
   */
  getConnectionConfig(): Record<string, any> {
    const pool = getPostgresPool();
    return (pool as any).pool?.options || {};
  }
}

export const dbService = new DatabaseService();
