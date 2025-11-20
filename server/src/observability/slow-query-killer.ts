/**
 * Slow Query Killer
 * Automatically terminates queries exceeding configurable thresholds
 * Supports PostgreSQL, Neo4j, and TimescaleDB
 */

import { Pool as PgPool } from 'pg';
import logger from '../utils/logger.js';
import { slowQueryCounter } from './metrics-enhanced.js';

// Configuration
interface SlowQueryConfig {
  enabled: boolean;
  thresholds: {
    postgres: number; // milliseconds
    neo4j: number;
    timescale: number;
  };
  checkIntervalMs: number;
  dryRun: boolean; // If true, log but don't kill
}

const DEFAULT_CONFIG: SlowQueryConfig = {
  enabled: process.env.SLOW_QUERY_KILLER_ENABLED === 'true',
  thresholds: {
    postgres: parseInt(process.env.POSTGRES_SLOW_QUERY_MS || '5000', 10),
    neo4j: parseInt(process.env.NEO4J_SLOW_QUERY_MS || '10000', 10),
    timescale: parseInt(process.env.TIMESCALE_SLOW_QUERY_MS || '15000', 10),
  },
  checkIntervalMs: parseInt(process.env.SLOW_QUERY_CHECK_INTERVAL_MS || '5000', 10),
  dryRun: process.env.SLOW_QUERY_KILLER_DRY_RUN === 'true',
};

interface ActiveQuery {
  id: string;
  query: string;
  startTime: Date;
  database: 'postgres' | 'neo4j' | 'timescale';
  tenantId?: string;
  user?: string;
  pid?: number;
}

/**
 * Slow Query Killer Service
 */
export class SlowQueryKiller {
  private config: SlowQueryConfig;
  private activeQueries: Map<string, ActiveQuery>;
  private checkInterval: NodeJS.Timeout | null;
  private pgPool: PgPool | null;
  private neo4jDriver: any | null;

  constructor(config: Partial<SlowQueryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeQueries = new Map();
    this.checkInterval = null;
    this.pgPool = null;
    this.neo4jDriver = null;
  }

  /**
   * Initialize with database connections
   */
  initialize(pgPool?: PgPool, neo4jDriver?: any) {
    this.pgPool = pgPool || null;
    this.neo4jDriver = neo4jDriver || null;

    if (this.config.enabled) {
      this.start();
      logger.info('Slow Query Killer initialized', {
        thresholds: this.config.thresholds,
        checkInterval: this.config.checkIntervalMs,
        dryRun: this.config.dryRun,
      });
    } else {
      logger.info('Slow Query Killer is disabled');
    }
  }

  /**
   * Start the slow query checker
   */
  start() {
    if (this.checkInterval) {
      return; // Already running
    }

    this.checkInterval = setInterval(
      () => this.checkAndKillSlowQueries(),
      this.config.checkIntervalMs
    );

    logger.info('Slow Query Killer started');
  }

  /**
   * Stop the slow query checker
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Slow Query Killer stopped');
    }
  }

  /**
   * Register a query for monitoring
   */
  registerQuery(
    id: string,
    query: string,
    database: 'postgres' | 'neo4j' | 'timescale',
    metadata: { tenantId?: string; user?: string; pid?: number } = {}
  ): void {
    this.activeQueries.set(id, {
      id,
      query,
      startTime: new Date(),
      database,
      ...metadata,
    });

    logger.debug({
      queryId: id,
      database,
      msg: 'Query registered for monitoring',
    });
  }

  /**
   * Unregister a query (completed successfully)
   */
  unregisterQuery(id: string): void {
    const query = this.activeQueries.get(id);
    if (query) {
      const duration = Date.now() - query.startTime.getTime();
      this.activeQueries.delete(id);

      logger.debug({
        queryId: id,
        database: query.database,
        durationMs: duration,
        msg: 'Query completed and unregistered',
      });
    }
  }

  /**
   * Check for slow queries and kill them
   */
  private async checkAndKillSlowQueries(): Promise<void> {
    const now = Date.now();

    for (const [queryId, queryInfo] of this.activeQueries.entries()) {
      const duration = now - queryInfo.startTime.getTime();
      const threshold = this.config.thresholds[queryInfo.database];

      if (duration > threshold) {
        await this.killQuery(queryId, queryInfo, duration);
      }
    }
  }

  /**
   * Kill a specific slow query
   */
  private async killQuery(
    queryId: string,
    queryInfo: ActiveQuery,
    duration: number
  ): Promise<void> {
    const threshold = this.config.thresholds[queryInfo.database];

    logger.warn({
      queryId,
      database: queryInfo.database,
      durationMs: duration,
      thresholdMs: threshold,
      query: queryInfo.query.substring(0, 200),
      tenantId: queryInfo.tenantId,
      user: queryInfo.user,
      msg: 'Slow query detected - attempting to kill',
    });

    // Increment slow query counter
    slowQueryCounter.inc({
      database: queryInfo.database,
      operation: 'auto_kill',
      threshold_ms: threshold.toString(),
      tenant_id: queryInfo.tenantId || 'unknown',
    });

    if (this.config.dryRun) {
      logger.info({
        queryId,
        msg: 'DRY RUN: Would have killed query',
      });
      this.activeQueries.delete(queryId);
      return;
    }

    try {
      switch (queryInfo.database) {
        case 'postgres':
        case 'timescale':
          await this.killPostgresQuery(queryInfo);
          break;
        case 'neo4j':
          await this.killNeo4jQuery(queryInfo);
          break;
      }

      this.activeQueries.delete(queryId);

      logger.info({
        queryId,
        database: queryInfo.database,
        durationMs: duration,
        msg: 'Slow query killed successfully',
      });
    } catch (error) {
      logger.error({
        queryId,
        database: queryInfo.database,
        error: (error as Error).message,
        msg: 'Failed to kill slow query',
      });
    }
  }

  /**
   * Kill a PostgreSQL query by PID
   */
  private async killPostgresQuery(queryInfo: ActiveQuery): Promise<void> {
    if (!this.pgPool) {
      logger.warn('PostgreSQL pool not available for killing query');
      return;
    }

    try {
      // Find the query by its text and kill it
      const result = await this.pgPool.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE state = 'active'
           AND query LIKE $1
           AND pid != pg_backend_pid()
         LIMIT 1`,
        [`%${queryInfo.query.substring(0, 100)}%`]
      );

      if (result.rowCount === 0) {
        logger.warn({
          queryId: queryInfo.id,
          msg: 'PostgreSQL query not found in pg_stat_activity',
        });
      }
    } catch (error) {
      logger.error({
        queryId: queryInfo.id,
        error: (error as Error).message,
        msg: 'Error killing PostgreSQL query',
      });
      throw error;
    }
  }

  /**
   * Kill a Neo4j query by transaction ID
   */
  private async killNeo4jQuery(queryInfo: ActiveQuery): Promise<void> {
    if (!this.neo4jDriver) {
      logger.warn('Neo4j driver not available for killing query');
      return;
    }

    try {
      const session = this.neo4jDriver.session();

      try {
        // Find and terminate the query
        await session.run(
          `CALL dbms.listQueries() YIELD queryId, query, elapsedTimeMillis
           WHERE query CONTAINS $querySubstring
             AND elapsedTimeMillis > $threshold
           WITH queryId
           CALL dbms.killQuery(queryId) YIELD queryId as killedId
           RETURN killedId`,
          {
            querySubstring: queryInfo.query.substring(0, 100),
            threshold: this.config.thresholds.neo4j,
          }
        );

        logger.info({
          queryId: queryInfo.id,
          msg: 'Neo4j query terminated',
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error({
        queryId: queryInfo.id,
        error: (error as Error).message,
        msg: 'Error killing Neo4j query',
      });
      throw error;
    }
  }

  /**
   * Get all currently active queries
   */
  getActiveQueries(): ActiveQuery[] {
    return Array.from(this.activeQueries.values());
  }

  /**
   * Get slow query statistics from PostgreSQL
   */
  async getPostgresSlowQueries(limitMs: number = 1000): Promise<any[]> {
    if (!this.pgPool) {
      return [];
    }

    try {
      const result = await this.pgPool.query(
        `SELECT
           pid,
           usename,
           application_name,
           state,
           query,
           EXTRACT(EPOCH FROM (now() - query_start)) * 1000 AS duration_ms
         FROM pg_stat_activity
         WHERE state = 'active'
           AND query NOT LIKE '%pg_stat_activity%'
           AND EXTRACT(EPOCH FROM (now() - query_start)) * 1000 > $1
         ORDER BY query_start ASC`,
        [limitMs]
      );

      return result.rows;
    } catch (error) {
      logger.error({
        error: (error as Error).message,
        msg: 'Error fetching PostgreSQL slow queries',
      });
      return [];
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SlowQueryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SlowQueryConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Slow Query Killer configuration updated', this.config);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeQueries: this.activeQueries.size,
      enabled: this.config.enabled,
      dryRun: this.config.dryRun,
      thresholds: this.config.thresholds,
    };
  }
}

// Singleton instance
export const slowQueryKiller = new SlowQueryKiller();

export default slowQueryKiller;
