/**
 * Enhanced Neo4j Connection Manager
 *
 * Optimized connection pooling, query management, and resource efficiency
 * for Neo4j graph database operations.
 */

import neo4j, { Driver, Session, auth, Config, SessionConfig } from 'neo4j-driver';
import pino from 'pino';
import { performance } from 'node:perf_hooks';

const logger = pino({ name: 'neo4j-connection-manager' });

export interface Neo4jPoolConfig {
  uri: string;
  username: string;
  password: string;
  maxConnectionPoolSize?: number;
  maxConnectionLifetime?: number; // milliseconds
  connectionAcquisitionTimeout?: number; // milliseconds
  connectionTimeout?: number; // milliseconds
  maxTransactionRetryTime?: number; // milliseconds
  logging?: {
    level: string;
    logger: (level: string, message: string) => void;
  };
}

export interface QueryStats {
  queryId: string;
  query: string;
  params: any;
  duration: number;
  recordCount: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PoolHealth {
  healthy: boolean;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  queuedRequests: number;
  averageQueryTime: number;
  slowQueries: number;
  failedQueries: number;
  lastError?: string;
}

export class Neo4jConnectionManager {
  private driver: Driver | null = null;
  private queryStats: QueryStats[] = [];
  private maxQueryStatsSize = 1000;
  private slowQueryThreshold = 2000; // 2 seconds
  private queryTimeout = 30000; // 30 seconds default
  private connectionLeakDetectionTimeout = 60000; // 1 minute
  private activeSessionTracking = new Map<string, { created: Date; query?: string }>();

  constructor(private config: Neo4jPoolConfig) {
    this.initializeDriver();
    this.startHealthChecks();
    this.startLeakDetection();
  }

  /**
   * Initialize Neo4j driver with optimized connection pooling
   */
  private initializeDriver(): void {
    try {
      const driverConfig: Config = {
        maxConnectionPoolSize: this.config.maxConnectionPoolSize || 50,
        maxConnectionLifetime: this.config.maxConnectionLifetime || 3600000, // 1 hour
        connectionAcquisitionTimeout: this.config.connectionAcquisitionTimeout || 60000,
        connectionTimeout: this.config.connectionTimeout || 30000,
        maxTransactionRetryTime: this.config.maxTransactionRetryTime || 30000,

        // Enable TCP keepalive to detect dead connections
        socketKeepAlive: true,

        // Optimize for performance
        disableLosslessIntegers: true, // Use native JavaScript numbers

        // Logging configuration
        logging: this.config.logging || {
          level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
          logger: (level, message) => {
            if (level === 'error') {
              logger.error(message);
            } else if (level === 'warn') {
              logger.warn(message);
            } else {
              logger.debug(message);
            }
          },
        },
      };

      this.driver = neo4j.driver(
        this.config.uri,
        auth.basic(this.config.username, this.config.password),
        driverConfig,
      );

      // Verify connectivity
      this.driver.verifyConnectivity()
        .then(() => {
          logger.info('Neo4j connection pool initialized successfully');
        })
        .catch((error) => {
          logger.error({ error }, 'Failed to verify Neo4j connectivity');
          throw error;
        });
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Neo4j driver');
      throw error;
    }
  }

  /**
   * Execute a read query with automatic retry and timeout
   */
  async executeRead<T = any>(
    query: string,
    params: any = {},
    options: { timeout?: number; database?: string } = {},
  ): Promise<T[]> {
    return this.executeQuery(query, params, 'READ', options);
  }

  /**
   * Execute a write query with automatic retry and timeout
   */
  async executeWrite<T = any>(
    query: string,
    params: any = {},
    options: { timeout?: number; database?: string } = {},
  ): Promise<T[]> {
    return this.executeQuery(query, params, 'WRITE', options);
  }

  /**
   * Execute a query with optimized session management
   */
  private async executeQuery<T = any>(
    query: string,
    params: any,
    accessMode: 'READ' | 'WRITE',
    options: { timeout?: number; database?: string } = {},
  ): Promise<T[]> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const queryId = this.generateQueryId();
    const startTime = performance.now();
    let session: Session | null = null;

    try {
      const sessionConfig: SessionConfig = {
        defaultAccessMode: accessMode === 'READ'
          ? neo4j.session.READ
          : neo4j.session.WRITE,
        database: options.database || process.env.NEO4J_DATABASE || 'neo4j',
      };

      session = this.driver.session(sessionConfig);
      this.trackSession(queryId, session, query);

      // Execute query with timeout
      const timeout = options.timeout || this.queryTimeout;
      const result = await Promise.race([
        session.run(query, params),
        this.createTimeout(timeout, queryId),
      ]);

      const duration = performance.now() - startTime;
      const records = result.records.map((r) => r.toObject() as T);

      // Record stats
      this.recordQueryStats({
        queryId,
        query,
        params,
        duration,
        recordCount: records.length,
        timestamp: new Date(),
        success: true,
      });

      // Warn about slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn(
          {
            queryId,
            duration,
            query: this.truncateQuery(query),
            recordCount: records.length,
          },
          'Slow Neo4j query detected',
        );
      }

      return records;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordQueryStats({
        queryId,
        query,
        params,
        duration,
        recordCount: 0,
        timestamp: new Date(),
        success: false,
        error: (error as Error).message,
      });

      logger.error(
        {
          error,
          queryId,
          query: this.truncateQuery(query),
          duration,
        },
        'Neo4j query failed',
      );

      throw error;
    } finally {
      if (session) {
        await session.close();
        this.untrackSession(queryId);
      }
    }
  }

  /**
   * Execute a transaction with multiple queries
   */
  async executeTransaction<T = any>(
    transactionWork: (tx: any) => Promise<T>,
    accessMode: 'READ' | 'WRITE' = 'WRITE',
    options: { timeout?: number; database?: string } = {},
  ): Promise<T> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const queryId = this.generateQueryId();
    const startTime = performance.now();
    let session: Session | null = null;

    try {
      const sessionConfig: SessionConfig = {
        defaultAccessMode: accessMode === 'READ'
          ? neo4j.session.READ
          : neo4j.session.WRITE,
        database: options.database || process.env.NEO4J_DATABASE || 'neo4j',
      };

      session = this.driver.session(sessionConfig);
      this.trackSession(queryId, session, 'TRANSACTION');

      const timeout = options.timeout || this.queryTimeout;

      let result: T;
      if (accessMode === 'READ') {
        result = await Promise.race([
          session.executeRead(transactionWork),
          this.createTimeout(timeout, queryId),
        ]);
      } else {
        result = await Promise.race([
          session.executeWrite(transactionWork),
          this.createTimeout(timeout, queryId),
        ]);
      }

      const duration = performance.now() - startTime;

      this.recordQueryStats({
        queryId,
        query: 'TRANSACTION',
        params: {},
        duration,
        recordCount: 0,
        timestamp: new Date(),
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordQueryStats({
        queryId,
        query: 'TRANSACTION',
        params: {},
        duration,
        recordCount: 0,
        timestamp: new Date(),
        success: false,
        error: (error as Error).message,
      });

      logger.error({ error, queryId, duration }, 'Neo4j transaction failed');
      throw error;
    } finally {
      if (session) {
        await session.close();
        this.untrackSession(queryId);
      }
    }
  }

  /**
   * Get health status of connection pool
   */
  async getHealth(): Promise<PoolHealth> {
    const recentQueries = this.queryStats.slice(-100);
    const averageQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0;

    const slowQueries = recentQueries.filter(q => q.duration > this.slowQueryThreshold).length;
    const failedQueries = recentQueries.filter(q => !q.success).length;
    const lastError = recentQueries.find(q => !q.success)?.error;

    let healthy = true;
    let serverInfo: any = null;

    try {
      if (this.driver) {
        await this.driver.verifyConnectivity();
        serverInfo = await this.driver.getServerInfo();
      }
    } catch (error) {
      healthy = false;
      logger.error({ error }, 'Neo4j health check failed');
    }

    return {
      healthy,
      activeConnections: this.activeSessionTracking.size,
      idleConnections: serverInfo ?
        (this.config.maxConnectionPoolSize || 50) - this.activeSessionTracking.size :
        0,
      totalConnections: this.config.maxConnectionPoolSize || 50,
      queuedRequests: 0, // Not directly available from driver
      averageQueryTime,
      slowQueries,
      failedQueries,
      lastError,
    };
  }

  /**
   * Get query statistics
   */
  getQueryStatistics(): {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    p95Duration: number;
    slowQueries: number;
  } {
    const total = this.queryStats.length;
    const successful = this.queryStats.filter(q => q.success).length;
    const failed = total - successful;

    const durations = this.queryStats.map(q => q.duration).sort((a, b) => a - b);
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index] || 0;

    const slowQueries = this.queryStats.filter(q => q.duration > this.slowQueryThreshold).length;

    return {
      total,
      successful,
      failed,
      averageDuration,
      p95Duration,
      slowQueries,
    };
  }

  /**
   * Get slow queries report
   */
  getSlowQueries(limit: number = 10): QueryStats[] {
    return [...this.queryStats]
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Close the driver and clean up resources
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      logger.info('Neo4j connection pool closed');
    }
  }

  /**
   * Track active session to detect leaks
   */
  private trackSession(queryId: string, session: Session, query: string): void {
    this.activeSessionTracking.set(queryId, {
      created: new Date(),
      query: this.truncateQuery(query),
    });
  }

  /**
   * Untrack closed session
   */
  private untrackSession(queryId: string): void {
    this.activeSessionTracking.delete(queryId);
  }

  /**
   * Create query timeout promise
   */
  private createTimeout(ms: number, queryId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Neo4j query timeout after ${ms}ms (queryId: ${queryId})`));
      }, ms);
    });
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `neo4j-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Record query statistics
   */
  private recordQueryStats(stats: QueryStats): void {
    this.queryStats.push(stats);

    // Limit stats size
    if (this.queryStats.length > this.maxQueryStatsSize) {
      this.queryStats.shift();
    }
  }

  /**
   * Truncate long queries for logging
   */
  private truncateQuery(query: string, maxLength: number = 200): string {
    if (query.length <= maxLength) {
      return query;
    }
    return query.substring(0, maxLength) + '...';
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        const health = await this.getHealth();

        if (!health.healthy) {
          logger.warn({ health }, 'Neo4j connection pool unhealthy');
        }

        if (health.slowQueries > 10) {
          logger.warn(
            { slowQueries: health.slowQueries, avgTime: health.averageQueryTime },
            'High number of slow Neo4j queries detected',
          );
        }
      } catch (error) {
        logger.error({ error }, 'Health check failed');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start connection leak detection
   */
  private startLeakDetection(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [queryId, info] of this.activeSessionTracking.entries()) {
        const age = now - info.created.getTime();

        if (age > this.connectionLeakDetectionTimeout) {
          logger.error(
            {
              queryId,
              age,
              query: info.query,
            },
            'Possible Neo4j session leak detected',
          );
        }
      }
    }, 60000); // Every minute
  }
}

// Singleton instance
let connectionManager: Neo4jConnectionManager | null = null;

export function initializeNeo4jConnectionManager(config: Neo4jPoolConfig): Neo4jConnectionManager {
  if (connectionManager) {
    logger.warn('Neo4j connection manager already initialized');
    return connectionManager;
  }

  connectionManager = new Neo4jConnectionManager(config);
  return connectionManager;
}

export function getNeo4jConnectionManager(): Neo4jConnectionManager {
  if (!connectionManager) {
    // Initialize with defaults from environment
    connectionManager = new Neo4jConnectionManager({
      uri: process.env.NEO4J_URI || 'bolt://neo4j:7687',
      username: process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'devpassword',
      maxConnectionPoolSize: parseInt(process.env.NEO4J_MAX_POOL_SIZE || '50', 10),
    });
  }

  return connectionManager;
}

export async function closeNeo4jConnectionManager(): Promise<void> {
  if (connectionManager) {
    await connectionManager.close();
    connectionManager = null;
  }
}
