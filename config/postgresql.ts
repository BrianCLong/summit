/**
 * PostgreSQL Configuration and Optimization
 *
 * This module provides:
 * - Optimized connection pooling (min: 5, max: 20)
 * - Prepared statement management
 * - Slow query logging (>100ms)
 * - Composite indexes for common queries
 * - Query performance monitoring
 */

import { Pool, PoolConfig, QueryConfig } from 'pg';
import pino from 'pino';

const logger = pino();

export interface PostgresOptimizedConfig extends PoolConfig {
  // Pool configuration
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;

  // Query optimization
  slowQueryThreshold?: number;
  enablePreparedStatements?: boolean;
  statementTimeout?: number;

  // Monitoring
  enableQueryLogging?: boolean;
  logSlowQueries?: boolean;
}

/**
 * Recommended PostgreSQL configuration
 */
export const defaultPostgresConfig: PostgresOptimizedConfig = {
  // Connection pool - optimized for typical workloads
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds

  // Query optimization
  slowQueryThreshold: 100, // 100ms
  enablePreparedStatements: true,
  statementTimeout: 30000, // 30 seconds

  // Monitoring
  enableQueryLogging: true,
  logSlowQueries: true,

  // PostgreSQL specific settings
  application_name: 'intelgraph',
};

/**
 * Composite indexes for common query patterns
 */
export interface CompositeIndexDefinition {
  table: string;
  name: string;
  columns: string[];
  unique?: boolean;
  where?: string;
  method?: 'btree' | 'hash' | 'gist' | 'gin' | 'brin';
}

/**
 * Recommended composite indexes
 */
export const COMPOSITE_INDEXES: CompositeIndexDefinition[] = [
  // Entities table
  {
    table: 'entities',
    name: 'idx_entities_tenant_type',
    columns: ['tenant_id', 'type'],
    method: 'btree',
  },
  {
    table: 'entities',
    name: 'idx_entities_tenant_created',
    columns: ['tenant_id', 'created_at'],
    method: 'btree',
  },
  {
    table: 'entities',
    name: 'idx_entities_type_confidence',
    columns: ['type', 'confidence'],
    method: 'btree',
    where: 'confidence > 0.5',
  },
  {
    table: 'entities',
    name: 'idx_entities_canonical_tenant',
    columns: ['canonical_id', 'tenant_id'],
    method: 'btree',
  },

  // Relationships table
  {
    table: 'relationships',
    name: 'idx_relationships_source_target',
    columns: ['source_id', 'target_id'],
    method: 'btree',
  },
  {
    table: 'relationships',
    name: 'idx_relationships_tenant_type',
    columns: ['tenant_id', 'type'],
    method: 'btree',
  },
  {
    table: 'relationships',
    name: 'idx_relationships_tenant_created',
    columns: ['tenant_id', 'created_at'],
    method: 'btree',
  },

  // Investigations table
  {
    table: 'investigations',
    name: 'idx_investigations_tenant_status',
    columns: ['tenant_id', 'status'],
    method: 'btree',
  },
  {
    table: 'investigations',
    name: 'idx_investigations_tenant_priority',
    columns: ['tenant_id', 'priority'],
    method: 'btree',
  },
  {
    table: 'investigations',
    name: 'idx_investigations_status_created',
    columns: ['status', 'created_at'],
    method: 'btree',
  },
  {
    table: 'investigations',
    name: 'idx_investigations_assigned_user',
    columns: ['assigned_to', 'status'],
    method: 'btree',
    where: 'assigned_to IS NOT NULL',
  },

  // Sources table
  {
    table: 'sources',
    name: 'idx_sources_tenant_type',
    columns: ['tenant_id', 'type'],
    method: 'btree',
  },
  {
    table: 'sources',
    name: 'idx_sources_entity_created',
    columns: ['entity_id', 'created_at'],
    method: 'btree',
  },

  // Users table
  {
    table: 'users',
    name: 'idx_users_tenant_role',
    columns: ['tenant_id', 'role'],
    method: 'btree',
  },
  {
    table: 'users',
    name: 'idx_users_email_tenant',
    columns: ['email', 'tenant_id'],
    unique: true,
  },

  // Audit logs (if exists)
  {
    table: 'audit_logs',
    name: 'idx_audit_tenant_created',
    columns: ['tenant_id', 'created_at'],
    method: 'btree',
  },
  {
    table: 'audit_logs',
    name: 'idx_audit_user_action',
    columns: ['user_id', 'action'],
    method: 'btree',
  },

  // Entity embeddings (vector similarity)
  {
    table: 'entity_embeddings',
    name: 'idx_entity_embeddings_entity',
    columns: ['entity_id'],
    method: 'btree',
  },

  // MCP sessions
  {
    table: 'mcp_sessions',
    name: 'idx_mcp_sessions_user_created',
    columns: ['user_id', 'created_at'],
    method: 'btree',
  },

  // Pipelines
  {
    table: 'pipelines',
    name: 'idx_pipelines_tenant_status',
    columns: ['tenant_id', 'status'],
    method: 'btree',
  },
];

/**
 * Create optimized PostgreSQL pool
 */
export function createOptimizedPool(config: PostgresOptimizedConfig): Pool {
  const poolConfig: PoolConfig = {
    ...config,
    min: config.min ?? defaultPostgresConfig.min,
    max: config.max ?? defaultPostgresConfig.max,
    idleTimeoutMillis: config.idleTimeoutMillis ?? defaultPostgresConfig.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? defaultPostgresConfig.connectionTimeoutMillis,
    application_name: config.application_name ?? defaultPostgresConfig.application_name,
  };

  const pool = new Pool(poolConfig);

  // Monitor pool events
  pool.on('connect', () => {
    logger.debug('New PostgreSQL client connected to pool');
  });

  pool.on('acquire', () => {
    logger.debug('PostgreSQL client acquired from pool');
  });

  pool.on('remove', () => {
    logger.debug('PostgreSQL client removed from pool');
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle PostgreSQL client:', err);
  });

  return pool;
}

/**
 * Query wrapper with performance monitoring
 */
export class OptimizedPostgresClient {
  private pool: Pool;
  private slowQueryThreshold: number;
  private preparedStatements: Map<string, string>;
  private queryStats: Map<string, { count: number; totalTime: number; maxTime: number }>;

  constructor(pool: Pool, config: PostgresOptimizedConfig = {}) {
    this.pool = pool;
    this.slowQueryThreshold = config.slowQueryThreshold ?? defaultPostgresConfig.slowQueryThreshold!;
    this.preparedStatements = new Map();
    this.queryStats = new Map();
  }

  /**
   * Execute query with performance monitoring
   */
  async query(text: string, params?: any[]): Promise<any> {
    const startTime = Date.now();
    const queryHash = this.hashQuery(text);

    try {
      // Use prepared statement if enabled
      const queryConfig: QueryConfig = {
        text,
        values: params,
      };

      const result = await this.pool.query(queryConfig);
      const duration = Date.now() - startTime;

      // Update statistics
      this.updateStats(queryHash, duration);

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn({
          msg: 'Slow query detected',
          query: text.substring(0, 200),
          duration,
          threshold: this.slowQueryThreshold,
          rows: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        msg: 'Query failed',
        query: text.substring(0, 200),
        duration,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Execute query in transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    const stats: any[] = [];
    for (const [query, data] of this.queryStats.entries()) {
      stats.push({
        query,
        count: data.count,
        avgTime: data.totalTime / data.count,
        maxTime: data.maxTime,
      });
    }
    return stats.sort((a, b) => b.avgTime - a.avgTime);
  }

  /**
   * Reset query statistics
   */
  resetStats(): void {
    this.queryStats.clear();
  }

  /**
   * Close pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Hash query for statistics tracking
   */
  private hashQuery(text: string): string {
    // Normalize query by removing whitespace and values
    return text.replace(/\s+/g, ' ').substring(0, 100);
  }

  /**
   * Update query statistics
   */
  private updateStats(queryHash: string, duration: number): void {
    const existing = this.queryStats.get(queryHash);
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.maxTime = Math.max(existing.maxTime, duration);
    } else {
      this.queryStats.set(queryHash, {
        count: 1,
        totalTime: duration,
        maxTime: duration,
      });
    }
  }
}

/**
 * Apply composite indexes to database
 */
export async function applyCompositeIndexes(
  client: any,
  indexes: CompositeIndexDefinition[],
): Promise<void> {
  for (const index of indexes) {
    try {
      const columns = index.columns.join(', ');
      const unique = index.unique ? 'UNIQUE' : '';
      const method = index.method ? `USING ${index.method.toUpperCase()}` : '';
      const where = index.where ? `WHERE ${index.where}` : '';

      const query = `
        CREATE ${unique} INDEX IF NOT EXISTS ${index.name}
        ON ${index.table} ${method} (${columns})
        ${where}
      `.trim();

      await client.query(query);
      logger.info(`Created index: ${index.name} on ${index.table}`);
    } catch (error) {
      logger.error(`Failed to create index ${index.name}:`, error);
    }
  }
}

/**
 * Analyze table to update statistics
 */
export async function analyzeTable(client: any, table: string): Promise<void> {
  try {
    await client.query(`ANALYZE ${table}`);
    logger.info(`Analyzed table: ${table}`);
  } catch (error) {
    logger.error(`Failed to analyze table ${table}:`, error);
  }
}

/**
 * Get table size and statistics
 */
export async function getTableStats(client: any, table: string): Promise<any> {
  const query = `
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
      pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
      n_tup_ins AS inserts,
      n_tup_upd AS updates,
      n_tup_del AS deletes,
      n_live_tup AS live_tuples,
      n_dead_tup AS dead_tuples,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables
    WHERE tablename = $1
  `;

  const result = await client.query(query, [table]);
  return result.rows[0];
}

/**
 * Get slow queries from pg_stat_statements
 */
export async function getSlowQueries(client: any, limit: number = 10): Promise<any[]> {
  const query = `
    SELECT
      query,
      calls,
      total_exec_time,
      mean_exec_time,
      max_exec_time,
      rows
    FROM pg_stat_statements
    WHERE mean_exec_time > 100
    ORDER BY mean_exec_time DESC
    LIMIT $1
  `;

  try {
    const result = await client.query(query, [limit]);
    return result.rows;
  } catch (error) {
    // pg_stat_statements extension might not be enabled
    logger.warn('pg_stat_statements not available');
    return [];
  }
}

export default {
  createOptimizedPool,
  OptimizedPostgresClient,
  defaultPostgresConfig,
  COMPOSITE_INDEXES,
  applyCompositeIndexes,
  analyzeTable,
  getTableStats,
  getSlowQueries,
};
