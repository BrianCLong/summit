/**
 * @fileoverview Multi-tenant Database Patterns and Management
 * Implements multiple isolation strategies: database-per-tenant, schema-per-tenant,
 * and row-level security with comprehensive connection pooling and query routing.
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { TenantConfig, TenantContext } from '../core/TenantManager.js';

/**
 * Database isolation strategies
 */
export type IsolationStrategy = 'database' | 'schema' | 'row_level';

/**
 * Database configuration per tenant
 */
export interface TenantDatabaseConfig {
  tenantId: string;
  strategy: IsolationStrategy;
  connectionString?: string; // For database-per-tenant
  schemaName?: string; // For schema-per-tenant
  maxConnections: number;
  idleTimeoutMs: number;
  queryTimeoutMs: number;
  sslMode: 'require' | 'prefer' | 'disable';
  enableQueryLogging: boolean;
  enablePerformanceMetrics: boolean;
  backupSettings: {
    enabled: boolean;
    schedule: string; // cron expression
    retentionDays: number;
    encryptBackups: boolean;
  };
}

/**
 * Database query context with tenant isolation
 */
export interface DatabaseQueryContext {
  tenantId: string;
  userId?: string;
  sessionId: string;
  isolationLevel: string;
  readOnly: boolean;
  timeoutMs?: number;
  tags: string[]; // For query classification and routing
}

/**
 * Query execution result with metadata
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  executionTimeMs: number;
  queryHash: string;
  fromCache: boolean;
  metadata: {
    tenantId: string;
    strategy: IsolationStrategy;
    connectionId: string;
    queryPlan?: any;
    warnings: string[];
  };
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  tenantId: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  avgQueryTime: number;
  queriesPerSecond: number;
  cacheHitRatio: number;
  lastActivity: Date;
}

/**
 * Migration tracking
 */
export interface MigrationRecord {
  migrationId: string;
  tenantId: string;
  version: string;
  appliedAt: Date;
  rollbackScript?: string;
  checksum: string;
  executionTimeMs: number;
}

/**
 * Query cache entry
 */
interface QueryCacheEntry {
  queryHash: string;
  result: any;
  expiry: Date;
  hitCount: number;
  tenantId: string;
}

/**
 * Comprehensive multi-tenant database management system
 */
export class TenantDatabaseManager extends EventEmitter {
  private pools: Map<string, Pool> = new Map();
  private configurations: Map<string, TenantDatabaseConfig> = new Map();
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private migrationHistory: Map<string, MigrationRecord[]> = new Map();
  private performanceMetrics: Map<string, any[]> = new Map();

  constructor(
    private globalConfig: {
      masterConnectionString: string;
      defaultIsolationStrategy: IsolationStrategy;
      enableQueryCache: boolean;
      cacheMaxSize: number;
      cacheTtlSeconds: number;
      enablePerformanceTracking: boolean;
      maxPoolsPerTenant: number;
    },
  ) {
    super();
    this.startMaintenanceTasks();
  }

  /**
   * Initialize database configuration for tenant
   */
  async initializeTenant(
    tenantConfig: TenantConfig,
    databaseConfig?: Partial<TenantDatabaseConfig>,
  ): Promise<TenantDatabaseConfig> {
    const dbConfig: TenantDatabaseConfig = {
      tenantId: tenantConfig.tenantId,
      strategy: this.globalConfig.defaultIsolationStrategy,
      maxConnections: this.getMaxConnectionsForTier(tenantConfig.tier),
      idleTimeoutMs: 30000,
      queryTimeoutMs: 60000,
      sslMode: 'require',
      enableQueryLogging: tenantConfig.features.auditLogging,
      enablePerformanceMetrics: true,
      backupSettings: {
        enabled: true,
        schedule: '0 2 * * *', // Daily at 2 AM
        retentionDays: this.getRetentionDaysForTier(tenantConfig.tier),
        encryptBackups: tenantConfig.security.encryptionAtRest,
      },
      ...databaseConfig,
    };

    // Validate configuration
    await this.validateDatabaseConfig(dbConfig);

    // Set up database isolation
    await this.setupDatabaseIsolation(dbConfig);

    // Create connection pool
    await this.createConnectionPool(dbConfig);

    // Initialize migration tracking
    this.migrationHistory.set(dbConfig.tenantId, []);

    // Store configuration
    this.configurations.set(dbConfig.tenantId, dbConfig);

    this.emit('tenant:database:initialized', {
      tenantId: dbConfig.tenantId,
      strategy: dbConfig.strategy,
    });

    return dbConfig;
  }

  /**
   * Execute query with tenant context and isolation
   */
  async executeQuery<T = any>(
    context: DatabaseQueryContext,
    query: string,
    params: any[] = [],
    options: {
      useCache?: boolean;
      priority?: 'low' | 'normal' | 'high';
      timeout?: number;
    } = {},
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, params, context.tenantId);

    try {
      // Check cache first if enabled
      if (this.globalConfig.enableQueryCache && options.useCache !== false) {
        const cached = this.getFromCache<T>(queryHash);
        if (cached) {
          return {
            ...cached,
            executionTimeMs: Date.now() - startTime,
            fromCache: true,
          };
        }
      }

      // Get database connection
      const client = await this.getConnection(context.tenantId);

      // Apply tenant isolation
      await this.applyTenantContext(client, context);

      // Set query timeout
      const timeout =
        options.timeout ||
        context.timeoutMs ||
        this.configurations.get(context.tenantId)?.queryTimeoutMs ||
        60000;

      // Execute query with timeout
      const result = await this.executeWithTimeout(
        client,
        query,
        params,
        timeout,
      );

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Prepare result
      const queryResult: QueryResult<T> = {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTimeMs,
        queryHash,
        fromCache: false,
        metadata: {
          tenantId: context.tenantId,
          strategy:
            this.configurations.get(context.tenantId)?.strategy || 'row_level',
          connectionId: (client as any).processID?.toString() || 'unknown',
          warnings: [],
        },
      };

      // Cache result if applicable
      if (
        this.globalConfig.enableQueryCache &&
        options.useCache !== false &&
        !context.readOnly
      ) {
        this.cacheResult(queryHash, queryResult, context.tenantId);
      }

      // Record performance metrics
      if (this.globalConfig.enablePerformanceTracking) {
        await this.recordQueryMetrics(context.tenantId, queryResult, query);
      }

      // Log query if enabled
      if (this.configurations.get(context.tenantId)?.enableQueryLogging) {
        await this.logQuery(context, query, params, queryResult);
      }

      // Release connection
      await this.releaseConnection(context.tenantId, client);

      return queryResult;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      // Log error
      console.error(`Query execution failed for tenant ${context.tenantId}:`, {
        query: query.substring(0, 200),
        error: error.message,
        executionTimeMs,
      });

      // Emit error event
      this.emit('query:error', {
        tenantId: context.tenantId,
        query,
        error,
        executionTimeMs,
      });

      throw error;
    }
  }

  /**
   * Execute transaction with tenant context
   */
  async executeTransaction<T>(
    context: DatabaseQueryContext,
    operations: Array<{
      query: string;
      params: any[];
    }>,
    options: {
      isolationLevel?: 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
      timeout?: number;
    } = {},
  ): Promise<QueryResult<T>[]> {
    const client = await this.getConnection(context.tenantId);
    const results: QueryResult<T>[] = [];

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Set isolation level if specified
      if (options.isolationLevel) {
        await client.query(
          `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`,
        );
      }

      // Apply tenant context
      await this.applyTenantContext(client, context);

      // Execute operations
      for (const operation of operations) {
        const result = await this.executeQuery<T>(
          context,
          operation.query,
          operation.params,
          { timeout: options.timeout },
        );
        results.push(result);
      }

      // Commit transaction
      await client.query('COMMIT');

      this.emit('transaction:committed', {
        tenantId: context.tenantId,
        operationCount: operations.length,
      });

      return results;
    } catch (error) {
      // Rollback on error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      this.emit('transaction:rolled_back', {
        tenantId: context.tenantId,
        error: error.message,
      });

      throw error;
    } finally {
      await this.releaseConnection(context.tenantId, client);
    }
  }

  /**
   * Execute migration for tenant
   */
  async executeMigration(
    tenantId: string,
    migration: {
      id: string;
      version: string;
      up: string;
      down?: string;
      description?: string;
    },
  ): Promise<MigrationRecord> {
    const startTime = Date.now();
    const context: DatabaseQueryContext = {
      tenantId,
      sessionId: `migration-${migration.id}`,
      isolationLevel: 'SERIALIZABLE',
      readOnly: false,
      tags: ['migration'],
    };

    try {
      // Check if migration already applied
      const existingMigrations = this.migrationHistory.get(tenantId) || [];
      const existing = existingMigrations.find(
        (m) => m.migrationId === migration.id,
      );

      if (existing) {
        throw new Error(`Migration ${migration.id} already applied`);
      }

      // Execute migration in transaction
      await this.executeTransaction(context, [
        {
          query: migration.up,
          params: [],
        },
      ]);

      // Record migration
      const record: MigrationRecord = {
        migrationId: migration.id,
        tenantId,
        version: migration.version,
        appliedAt: new Date(),
        rollbackScript: migration.down,
        checksum: this.generateChecksum(migration.up),
        executionTimeMs: Date.now() - startTime,
      };

      existingMigrations.push(record);
      this.migrationHistory.set(tenantId, existingMigrations);

      this.emit('migration:applied', {
        tenantId,
        migration: record,
      });

      return record;
    } catch (error) {
      this.emit('migration:failed', {
        tenantId,
        migrationId: migration.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Rollback migration for tenant
   */
  async rollbackMigration(
    tenantId: string,
    migrationId: string,
  ): Promise<void> {
    const migrations = this.migrationHistory.get(tenantId) || [];
    const migration = migrations.find((m) => m.migrationId === migrationId);

    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    if (!migration.rollbackScript) {
      throw new Error(
        `No rollback script available for migration: ${migrationId}`,
      );
    }

    const context: DatabaseQueryContext = {
      tenantId,
      sessionId: `rollback-${migrationId}`,
      isolationLevel: 'SERIALIZABLE',
      readOnly: false,
      tags: ['migration', 'rollback'],
    };

    try {
      // Execute rollback
      await this.executeTransaction(context, [
        {
          query: migration.rollbackScript,
          params: [],
        },
      ]);

      // Remove from migration history
      const updatedMigrations = migrations.filter(
        (m) => m.migrationId !== migrationId,
      );
      this.migrationHistory.set(tenantId, updatedMigrations);

      this.emit('migration:rolled_back', {
        tenantId,
        migrationId,
      });
    } catch (error) {
      this.emit('migration:rollback_failed', {
        tenantId,
        migrationId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get connection pool statistics
   */
  async getPoolStats(tenantId: string): Promise<PoolStats> {
    const pool = this.pools.get(tenantId);
    if (!pool) {
      throw new Error(`No connection pool found for tenant: ${tenantId}`);
    }

    const metrics = this.performanceMetrics.get(tenantId) || [];
    const recentMetrics = metrics.filter(
      (m) => Date.now() - m.timestamp < 60000, // Last minute
    );

    const avgQueryTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
          recentMetrics.length
        : 0;

    const queriesPerSecond = recentMetrics.length / 60;

    // Calculate cache hit ratio
    const cacheHits = recentMetrics.filter((m) => m.fromCache).length;
    const cacheHitRatio =
      recentMetrics.length > 0 ? (cacheHits / recentMetrics.length) * 100 : 0;

    return {
      tenantId,
      totalConnections: pool.totalCount,
      activeConnections: pool.totalCount - pool.idleCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
      avgQueryTime,
      queriesPerSecond,
      cacheHitRatio,
      lastActivity: new Date(),
    };
  }

  /**
   * Perform database health check for tenant
   */
  async healthCheck(tenantId: string): Promise<{
    healthy: boolean;
    connectionPool: boolean;
    queryExecution: boolean;
    lastMigration?: MigrationRecord;
    performance: {
      avgResponseTime: number;
      slowQueries: number;
      errorRate: number;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    let connectionPool = false;
    let queryExecution = false;

    try {
      // Check connection pool
      const pool = this.pools.get(tenantId);
      if (!pool) {
        issues.push('Connection pool not found');
      } else {
        connectionPool = true;

        if (pool.totalCount === 0) {
          issues.push('No active connections in pool');
        }
      }

      // Test query execution
      try {
        const context: DatabaseQueryContext = {
          tenantId,
          sessionId: `health-check-${Date.now()}`,
          isolationLevel: 'READ_COMMITTED',
          readOnly: true,
          tags: ['health-check'],
        };

        await this.executeQuery(context, 'SELECT 1 as health_check', []);
        queryExecution = true;
      } catch (error) {
        issues.push(`Query execution failed: ${error.message}`);
      }

      // Get performance metrics
      const metrics = this.performanceMetrics.get(tenantId) || [];
      const recentMetrics = metrics.filter(
        (m) => Date.now() - m.timestamp < 300000, // Last 5 minutes
      );

      const avgResponseTime =
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
            recentMetrics.length
          : 0;

      const slowQueries = recentMetrics.filter(
        (m) => m.executionTime > 1000,
      ).length;
      const errorQueries = recentMetrics.filter((m) => m.error).length;
      const errorRate =
        recentMetrics.length > 0
          ? (errorQueries / recentMetrics.length) * 100
          : 0;

      // Get last migration
      const migrations = this.migrationHistory.get(tenantId) || [];
      const lastMigration =
        migrations.length > 0 ? migrations[migrations.length - 1] : undefined;

      return {
        healthy: connectionPool && queryExecution && issues.length === 0,
        connectionPool,
        queryExecution,
        lastMigration,
        performance: {
          avgResponseTime,
          slowQueries,
          errorRate,
        },
        issues,
      };
    } catch (error) {
      issues.push(`Health check failed: ${error.message}`);

      return {
        healthy: false,
        connectionPool,
        queryExecution,
        performance: {
          avgResponseTime: 0,
          slowQueries: 0,
          errorRate: 100,
        },
        issues,
      };
    }
  }

  /**
   * Create backup for tenant database
   */
  async createBackup(
    tenantId: string,
    options: {
      includeData?: boolean;
      compress?: boolean;
      encrypt?: boolean;
    } = {},
  ): Promise<{
    backupId: string;
    location: string;
    size: number;
    createdAt: Date;
    encrypted: boolean;
  }> {
    const config = this.configurations.get(tenantId);
    if (!config) {
      throw new Error(
        `Database configuration not found for tenant: ${tenantId}`,
      );
    }

    const backupId = `backup_${tenantId}_${Date.now()}`;

    try {
      // In real implementation, would use pg_dump or similar
      const backupResult = await this.performBackup(
        tenantId,
        backupId,
        options,
      );

      this.emit('backup:created', {
        tenantId,
        backupId,
        ...backupResult,
      });

      return {
        backupId,
        ...backupResult,
      };
    } catch (error) {
      this.emit('backup:failed', {
        tenantId,
        backupId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Validate database configuration
   */
  private async validateDatabaseConfig(
    config: TenantDatabaseConfig,
  ): Promise<void> {
    // Validate strategy-specific requirements
    switch (config.strategy) {
      case 'database':
        if (!config.connectionString) {
          throw new Error(
            'Connection string required for database-per-tenant strategy',
          );
        }
        break;

      case 'schema':
        if (!config.schemaName) {
          config.schemaName = `tenant_${config.tenantId}`;
        }
        break;

      case 'row_level':
        // No additional validation required
        break;
    }

    // Validate connection limits
    if (config.maxConnections <= 0 || config.maxConnections > 100) {
      throw new Error('Max connections must be between 1 and 100');
    }
  }

  /**
   * Set up database isolation based on strategy
   */
  private async setupDatabaseIsolation(
    config: TenantDatabaseConfig,
  ): Promise<void> {
    switch (config.strategy) {
      case 'database':
        await this.setupDatabasePerTenant(config);
        break;

      case 'schema':
        await this.setupSchemaPerTenant(config);
        break;

      case 'row_level':
        await this.setupRowLevelSecurity(config);
        break;
    }
  }

  /**
   * Set up database-per-tenant isolation
   */
  private async setupDatabasePerTenant(
    config: TenantDatabaseConfig,
  ): Promise<void> {
    // Create dedicated database for tenant
    const masterPool = new Pool({
      connectionString: this.globalConfig.masterConnectionString,
    });

    try {
      const databaseName = `tenant_${config.tenantId}`;

      // Create database
      await masterPool.query(
        `CREATE DATABASE "${databaseName}" WITH ENCODING 'UTF8'`,
      );

      // Update connection string
      config.connectionString = config.connectionString?.replace(
        /\/[^/]*$/,
        `/${databaseName}`,
      );
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    } finally {
      await masterPool.end();
    }
  }

  /**
   * Set up schema-per-tenant isolation
   */
  private async setupSchemaPerTenant(
    config: TenantDatabaseConfig,
  ): Promise<void> {
    const pool = new Pool({
      connectionString: this.globalConfig.masterConnectionString,
    });

    try {
      const schemaName = config.schemaName || `tenant_${config.tenantId}`;

      // Create schema
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

      // Create tenant user with schema access
      const tenantUser = `user_${config.tenantId}`;
      await pool.query(
        `CREATE USER "${tenantUser}" WITH PASSWORD 'secure_password'`,
      );
      await pool.query(
        `GRANT USAGE ON SCHEMA "${schemaName}" TO "${tenantUser}"`,
      );
      await pool.query(
        `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "${schemaName}" TO "${tenantUser}"`,
      );
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    } finally {
      await pool.end();
    }
  }

  /**
   * Set up row-level security isolation
   */
  private async setupRowLevelSecurity(
    config: TenantDatabaseConfig,
  ): Promise<void> {
    const pool = new Pool({
      connectionString: this.globalConfig.masterConnectionString,
    });

    try {
      // Enable RLS on tenant tables (example for a generic table)
      await pool.query(`
        ALTER TABLE IF EXISTS tenant_data ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS tenant_isolation_policy ON tenant_data
        USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
        
        CREATE ROLE IF NOT EXISTS tenant_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_data TO tenant_user;
      `);
    } catch (error) {
      console.warn('Row-level security setup warning:', error.message);
    } finally {
      await pool.end();
    }
  }

  /**
   * Create connection pool for tenant
   */
  private async createConnectionPool(
    config: TenantDatabaseConfig,
  ): Promise<void> {
    const connectionString =
      config.connectionString || this.globalConfig.masterConnectionString;

    const pool = new Pool({
      connectionString,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMs,
      connectionTimeoutMillis: 10000,
      ssl: config.sslMode !== 'disable' ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    pool.on('error', (error) => {
      console.error(
        `Connection pool error for tenant ${config.tenantId}:`,
        error,
      );
      this.emit('pool:error', { tenantId: config.tenantId, error });
    });

    // Test connection
    try {
      const client = await pool.connect();
      client.release();
    } catch (error) {
      await pool.end();
      throw new Error(`Failed to create connection pool: ${error.message}`);
    }

    this.pools.set(config.tenantId, pool);
  }

  /**
   * Get database connection for tenant
   */
  private async getConnection(tenantId: string): Promise<PoolClient> {
    const pool = this.pools.get(tenantId);
    if (!pool) {
      throw new Error(`No connection pool found for tenant: ${tenantId}`);
    }

    try {
      return await pool.connect();
    } catch (error) {
      throw new Error(
        `Failed to get connection for tenant ${tenantId}: ${error.message}`,
      );
    }
  }

  /**
   * Release database connection
   */
  private async releaseConnection(
    tenantId: string,
    client: PoolClient,
  ): Promise<void> {
    try {
      client.release();
    } catch (error) {
      console.error(
        `Failed to release connection for tenant ${tenantId}:`,
        error,
      );
    }
  }

  /**
   * Apply tenant context to connection
   */
  private async applyTenantContext(
    client: PoolClient,
    context: DatabaseQueryContext,
  ): Promise<void> {
    const config = this.configurations.get(context.tenantId);
    if (!config) return;

    try {
      switch (config.strategy) {
        case 'schema':
          await client.query(
            `SET search_path TO "${config.schemaName}", public`,
          );
          break;

        case 'row_level':
          await client.query(
            `SET app.current_tenant_id = '${context.tenantId}'`,
          );
          if (context.userId) {
            await client.query(`SET app.current_user_id = '${context.userId}'`);
          }
          break;

        case 'database':
          // Database isolation doesn't require session setup
          break;
      }

      // Set session variables
      await client.query(
        `SET application_name = 'intelgraph_tenant_${context.tenantId}'`,
      );

      if (context.readOnly) {
        await client.query('SET default_transaction_read_only = on');
      }
    } catch (error) {
      console.error(
        `Failed to apply tenant context for ${context.tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Execute query with timeout
   */
  private async executeWithTimeout(
    client: PoolClient,
    query: string,
    params: any[],
    timeoutMs: number,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      client
        .query(query, params)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Generate query hash for caching
   */
  private generateQueryHash(
    query: string,
    params: any[],
    tenantId: string,
  ): string {
    const content = `${tenantId}:${query}:${JSON.stringify(params)}`;
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  /**
   * Get result from cache
   */
  private getFromCache<T>(queryHash: string): QueryResult<T> | null {
    const entry = this.queryCache.get(queryHash);
    if (!entry || entry.expiry < new Date()) {
      this.queryCache.delete(queryHash);
      return null;
    }

    entry.hitCount++;
    return entry.result;
  }

  /**
   * Cache query result
   */
  private cacheResult(
    queryHash: string,
    result: QueryResult,
    tenantId: string,
  ): void {
    // Don't cache if at max size
    if (this.queryCache.size >= this.globalConfig.cacheMaxSize) {
      // Remove oldest entry
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    const expiry = new Date(
      Date.now() + this.globalConfig.cacheTtlSeconds * 1000,
    );

    this.queryCache.set(queryHash, {
      queryHash,
      result,
      expiry,
      hitCount: 0,
      tenantId,
    });
  }

  /**
   * Record query performance metrics
   */
  private async recordQueryMetrics(
    tenantId: string,
    result: QueryResult,
    query: string,
  ): Promise<void> {
    const metrics = this.performanceMetrics.get(tenantId) || [];

    metrics.push({
      timestamp: Date.now(),
      executionTime: result.executionTimeMs,
      rowCount: result.rowCount,
      fromCache: result.fromCache,
      queryType: this.getQueryType(query),
      queryHash: result.queryHash,
    });

    // Keep only last 1000 metrics per tenant
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    this.performanceMetrics.set(tenantId, metrics);
  }

  /**
   * Log query execution
   */
  private async logQuery(
    context: DatabaseQueryContext,
    query: string,
    params: any[],
    result: QueryResult,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      tenantId: context.tenantId,
      userId: context.userId,
      sessionId: context.sessionId,
      query: query.substring(0, 500), // Truncate long queries
      params:
        params.length > 0 ? JSON.stringify(params).substring(0, 200) : null,
      executionTimeMs: result.executionTimeMs,
      rowCount: result.rowCount,
      success: true,
    };

    // In production, would send to centralized logging system
    console.log('Query Log:', logEntry);
  }

  /**
   * Get query type for classification
   */
  private getQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.startsWith('select')) return 'SELECT';
    if (normalizedQuery.startsWith('insert')) return 'INSERT';
    if (normalizedQuery.startsWith('update')) return 'UPDATE';
    if (normalizedQuery.startsWith('delete')) return 'DELETE';
    if (normalizedQuery.startsWith('create')) return 'CREATE';
    if (normalizedQuery.startsWith('alter')) return 'ALTER';
    if (normalizedQuery.startsWith('drop')) return 'DROP';

    return 'OTHER';
  }

  /**
   * Get max connections based on tenant tier
   */
  private getMaxConnectionsForTier(tier: string): number {
    const limits = {
      starter: 5,
      professional: 15,
      enterprise: 50,
      government: 100,
    };

    return limits[tier as keyof typeof limits] || 5;
  }

  /**
   * Get retention days based on tenant tier
   */
  private getRetentionDaysForTier(tier: string): number {
    const retention = {
      starter: 7,
      professional: 30,
      enterprise: 90,
      government: 2555, // 7 years
    };

    return retention[tier as keyof typeof retention] || 7;
  }

  /**
   * Generate checksum for migration
   */
  private generateChecksum(content: string): string {
    return require('crypto').createHash('sha256').update(content).digest('hex');
  }

  /**
   * Perform actual backup (mock implementation)
   */
  private async performBackup(
    tenantId: string,
    backupId: string,
    options: any,
  ): Promise<{
    location: string;
    size: number;
    createdAt: Date;
    encrypted: boolean;
  }> {
    // Mock backup implementation
    const location = `/backups/tenant_${tenantId}/${backupId}.sql${options.compress ? '.gz' : ''}`;
    const size = Math.floor(Math.random() * 1000000); // Random size for demo

    return {
      location,
      size,
      createdAt: new Date(),
      encrypted: options.encrypt || false,
    };
  }

  /**
   * Start maintenance tasks
   */
  private startMaintenanceTasks(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(
      () => {
        this.cleanupCache();
      },
      5 * 60 * 1000,
    );

    // Collect performance metrics every minute
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60 * 1000);

    // Health checks every 10 minutes
    setInterval(
      () => {
        this.performHealthChecks();
      },
      10 * 60 * 1000,
    );
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.expiry < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.queryCache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Collect performance metrics for all tenants
   */
  private async collectPerformanceMetrics(): Promise<void> {
    for (const [tenantId] of this.configurations) {
      try {
        const stats = await this.getPoolStats(tenantId);
        this.emit('metrics:collected', { tenantId, stats });
      } catch (error) {
        console.error(
          `Failed to collect metrics for tenant ${tenantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Perform health checks for all tenants
   */
  private async performHealthChecks(): Promise<void> {
    for (const [tenantId] of this.configurations) {
      try {
        const health = await this.healthCheck(tenantId);

        if (!health.healthy) {
          this.emit('health:warning', { tenantId, health });
        }
      } catch (error) {
        console.error(`Health check failed for tenant ${tenantId}:`, error);
        this.emit('health:error', { tenantId, error });
      }
    }
  }

  /**
   * Clean up resources for tenant (called when tenant is deleted)
   */
  async cleanupTenant(tenantId: string): Promise<void> {
    try {
      // Close connection pool
      const pool = this.pools.get(tenantId);
      if (pool) {
        await pool.end();
        this.pools.delete(tenantId);
      }

      // Clear cache entries
      for (const [key, entry] of this.queryCache.entries()) {
        if (entry.tenantId === tenantId) {
          this.queryCache.delete(key);
        }
      }

      // Clear metrics and migration history
      this.performanceMetrics.delete(tenantId);
      this.migrationHistory.delete(tenantId);
      this.configurations.delete(tenantId);

      this.emit('tenant:cleaned_up', { tenantId });
    } catch (error) {
      console.error(`Failed to cleanup tenant ${tenantId}:`, error);
      throw error;
    }
  }
}
