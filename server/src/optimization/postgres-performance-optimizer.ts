// server/src/optimization/postgres-performance-optimizer.ts

import { Pool } from 'pg';
import type { PoolClient, QueryResult } from 'pg';
import { getRedisClient } from '../config/database.js';
import logger from '../config/logger.js';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

interface QueryPlan {
  query: string;
  plan: any;
  executionTime: number;
  cost: number;
  rows: number;
  buffers: {
    hit: number;
    read: number;
    dirtied: number;
    written: number;
  };
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  indexType: 'btree' | 'gin' | 'gist' | 'hash';
  reason: string;
  estimatedImprovement: number;
  priority: 'high' | 'medium' | 'low';
}

interface ConnectionPoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: number;
  parameters: any[];
  stackTrace?: string;
  queryHash: string;
}

interface MaintenanceTask {
  name: string;
  schedule: string;
  lastRun: number;
  nextRun: number;
  enabled: boolean;
  action: () => Promise<void>;
}

export class PostgresPerformanceOptimizer extends EventEmitter {
  private pool: Pool;
  private redis = getRedisClient();
  private queryPlans: Map<string, QueryPlan> = new Map();
  private slowQueries: SlowQueryLog[] = [];
  private indexRecommendations: IndexRecommendation[] = [];
  private maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000;
  private readonly QUERY_PLAN_CACHE_TTL = 3600; // 1 hour
  private readonly CONNECTION_POOL_MONITOR_INTERVAL = 30000; // 30 seconds

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.initializeMonitoring();
    this.initializeMaintenanceTasks();
    this.startConnectionPoolMonitoring();
  }

  /**
   * 🚀 CORE: Optimized query execution with connection pooling
   */
  async executeOptimizedQuery<T = any>(
    query: string,
    parameters: any[] = [],
    options: {
      useCache?: boolean;
      cacheTtl?: number;
      forceRefresh?: boolean;
      timeout?: number;
      readOnly?: boolean;
      priority?: 'high' | 'medium' | 'low';
    } = {},
  ): Promise<{
    result: QueryResult<T>;
    executionTime: number;
    cacheHit: boolean;
    planUsed?: QueryPlan;
    optimizationApplied: string[];
  }> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, parameters);
    const optimizations: string[] = [];

    try {
      // Step 1: Check query cache
      if (options.useCache !== false && !options.forceRefresh) {
        const cachedResult = await this.getCachedResult<T>(queryHash);
        if (cachedResult) {
          optimizations.push('redis_cache');
          this.emit('cacheHit', { queryHash, query: query.substring(0, 100) });
          return {
            result: cachedResult,
            executionTime: Date.now() - startTime,
            cacheHit: true,
            optimizationApplied: optimizations,
          };
        }
      }

      // Step 2: Get optimized connection from pool
      const client = await this.getOptimizedConnection(options.priority);
      optimizations.push('connection_pooling');

      try {
        // Step 3: Analyze query plan for complex queries
        let planUsed: QueryPlan | undefined;
        if (this.shouldAnalyzeQuery(query)) {
          planUsed = await this.analyzeQueryPlan(client, query, parameters);
          optimizations.push('query_plan_analysis');
        }

        // Step 4: Execute query with timeout and monitoring
        const timeout = options.timeout || this.calculateQueryTimeout(query);
        const result = await this.executeWithTimeout(
          client,
          query,
          parameters,
          timeout,
        );

        const executionTime = Date.now() - startTime;

        // Step 5: Log slow queries and generate recommendations
        if (executionTime > this.SLOW_QUERY_THRESHOLD_MS) {
          await this.logSlowQuery(query, parameters, executionTime, queryHash);
          await this.generateIndexRecommendations(query, planUsed);
          optimizations.push('slow_query_logging');
        }

        // Step 6: Cache the result if appropriate
        if (
          options.useCache !== false &&
          this.shouldCacheResult(query, executionTime, result)
        ) {
          const ttl =
            options.cacheTtl || this.calculateCacheTtl(query, executionTime);
          await this.cacheResult(queryHash, result, ttl);
          optimizations.push('result_caching');
        }

        // Step 7: Update query performance statistics
        await this.updateQueryStats(queryHash, executionTime, result.rowCount);

        this.emit('queryExecuted', {
          queryHash,
          executionTime,
          rowCount: result.rowCount,
          optimizations,
        });

        return {
          result,
          executionTime,
          cacheHit: false,
          planUsed,
          optimizationApplied: optimizations,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.emit('queryError', {
        queryHash,
        error: error.message,
        executionTime,
        query: query.substring(0, 200),
      });
      throw error;
    }
  }

  /**
   * 🎯 Connection pool optimization
   */
  private async getOptimizedConnection(
    priority: 'high' | 'medium' | 'low' = 'medium',
  ): Promise<PoolClient> {
    const startTime = Date.now();

    // For high priority queries, try to get connection immediately
    if (priority === 'high') {
      try {
        return await Promise.race([
          this.pool.connect(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('High priority connection timeout')),
              1000,
            ),
          ),
        ]);
      } catch (error) {
        logger.warn(
          'High priority connection failed, falling back to normal priority',
          {
            error: error.message,
          },
        );
      }
    }

    const client = await this.pool.connect();
    const waitTime = Date.now() - startTime;

    if (waitTime > 5000) {
      this.emit('connectionPoolDelay', { waitTime, priority });
      logger.warn('Long connection wait time', { waitTime, priority });
    }

    return client;
  }

  /**
   * 📊 Query plan analysis and optimization
   */
  private async analyzeQueryPlan(
    client: PoolClient,
    query: string,
    parameters: any[],
  ): Promise<QueryPlan> {
    const queryHash = this.generateQueryHash(query, parameters);

    // Check if we have a cached plan
    if (this.queryPlans.has(queryHash)) {
      const cachedPlan = this.queryPlans.get(queryHash)!;
      // Use cached plan if it's less than 1 hour old
      if (
        Date.now() - cachedPlan.executionTime <
        this.QUERY_PLAN_CACHE_TTL * 1000
      ) {
        return cachedPlan;
      }
    }

    try {
      const planQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const planResult = await client.query(planQuery, parameters);
      const plan = planResult.rows[0]['QUERY PLAN'][0];

      const queryPlan: QueryPlan = {
        query,
        plan,
        executionTime: Date.now(),
        cost: plan['Total Cost'] || 0,
        rows: plan['Actual Rows'] || 0,
        buffers: {
          hit: plan['Shared Hit Blocks'] || 0,
          read: plan['Shared Read Blocks'] || 0,
          dirtied: plan['Shared Dirtied Blocks'] || 0,
          written: plan['Shared Written Blocks'] || 0,
        },
      };

      this.queryPlans.set(queryHash, queryPlan);
      return queryPlan;
    } catch (error) {
      logger.warn('Failed to analyze query plan', {
        error: error.message,
        query: query.substring(0, 100),
      });

      // Return a minimal plan
      return {
        query,
        plan: {},
        executionTime: Date.now(),
        cost: 0,
        rows: 0,
        buffers: { hit: 0, read: 0, dirtied: 0, written: 0 },
      };
    }
  }

  /**
   * 🔍 Index recommendation engine
   */
  private async generateIndexRecommendations(
    query: string,
    plan?: QueryPlan,
  ): Promise<void> {
    const recommendations: IndexRecommendation[] = [];

    // Analyze query for common patterns that benefit from indexes
    const queryLower = query.toLowerCase();

    // Sequential scan detection
    if (plan && JSON.stringify(plan.plan).includes('Seq Scan')) {
      const seqScanTables = this.extractTablesFromPlan(plan.plan);
      for (const table of seqScanTables) {
        recommendations.push({
          table,
          columns: this.extractFilterColumns(query, table),
          indexType: 'btree',
          reason: 'Sequential scan detected on filtered columns',
          estimatedImprovement: 0.7,
          priority: 'high',
        });
      }
    }

    // WHERE clause analysis
    const whereMatch = queryLower.match(/where\s+([^group|order|limit|;]+)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const filterColumns = this.extractFilterColumnsFromWhere(whereClause);

      filterColumns.forEach(({ table, column, operator }) => {
        let indexType: 'btree' | 'gin' | 'gist' | 'hash' = 'btree';
        let priority: 'high' | 'medium' | 'low' = 'medium';

        // Determine optimal index type
        if (operator.includes('like') || operator.includes('ilike')) {
          indexType = 'gin';
          priority = 'high';
        } else if (operator.includes('=')) {
          indexType = 'hash';
          priority = 'high';
        }

        recommendations.push({
          table,
          columns: [column],
          indexType,
          reason: `WHERE clause filtering on ${column} with ${operator}`,
          estimatedImprovement: 0.6,
          priority,
        });
      });
    }

    // ORDER BY analysis
    const orderByMatch = queryLower.match(/order\s+by\s+([^limit|;]+)/i);
    if (orderByMatch) {
      const orderByColumns = this.extractOrderByColumns(orderByMatch[1]);

      if (orderByColumns.length > 0) {
        recommendations.push({
          table: this.extractMainTable(query),
          columns: orderByColumns,
          indexType: 'btree',
          reason: 'ORDER BY clause requires sorted access',
          estimatedImprovement: 0.5,
          priority: 'medium',
        });
      }
    }

    // JOIN analysis
    const joinMatches = queryLower.matchAll(
      /join\s+(\w+)\s+\w+\s+on\s+([^where|group|order|join]+)/gi,
    );
    for (const joinMatch of joinMatches) {
      const table = joinMatch[1];
      const joinCondition = joinMatch[2];
      const joinColumns = this.extractJoinColumns(joinCondition);

      joinColumns.forEach((column) => {
        recommendations.push({
          table,
          columns: [column],
          indexType: 'btree',
          reason: 'JOIN condition requires index for efficient join',
          estimatedImprovement: 0.8,
          priority: 'high',
        });
      });
    }

    // Add unique recommendations to the main list
    for (const rec of recommendations) {
      const exists = this.indexRecommendations.some(
        (existing) =>
          existing.table === rec.table &&
          existing.columns.join(',') === rec.columns.join(',') &&
          existing.indexType === rec.indexType,
      );

      if (!exists) {
        this.indexRecommendations.push(rec);

        // Limit total recommendations to prevent memory issues
        if (this.indexRecommendations.length > 100) {
          this.indexRecommendations = this.indexRecommendations
            .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
            .slice(0, 100);
        }
      }
    }
  }

  /**
   * 🏥 Database maintenance automation
   */
  private initializeMaintenanceTasks(): void {
    const tasks: MaintenanceTask[] = [
      {
        name: 'analyze_tables',
        schedule: '0 2 * * *', // Daily at 2 AM
        lastRun: 0,
        nextRun: 0,
        enabled: true,
        action: () => this.analyzeAllTables(),
      },
      {
        name: 'vacuum_analyze',
        schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
        lastRun: 0,
        nextRun: 0,
        enabled: true,
        action: () => this.vacuumAnalyzeTables(),
      },
      {
        name: 'reindex_fragmented',
        schedule: '0 1 * * 0', // Weekly on Sunday at 1 AM
        lastRun: 0,
        nextRun: 0,
        enabled: true,
        action: () => this.reindexFragmentedIndexes(),
      },
      {
        name: 'clean_slow_query_log',
        schedule: '0 0 * * *', // Daily at midnight
        lastRun: 0,
        nextRun: 0,
        enabled: true,
        action: () => this.cleanSlowQueryLog(),
      },
      {
        name: 'update_table_stats',
        schedule: '*/30 * * * *', // Every 30 minutes
        lastRun: 0,
        nextRun: 0,
        enabled: true,
        action: () => this.updateTableStatistics(),
      },
    ];

    tasks.forEach((task) => {
      this.maintenanceTasks.set(task.name, task);
    });

    // Start maintenance scheduler
    setInterval(() => this.runScheduledMaintenance(), 60000); // Check every minute
  }

  private async runScheduledMaintenance(): Promise<void> {
    const now = Date.now();

    for (const [name, task] of this.maintenanceTasks) {
      if (!task.enabled) continue;

      // Simple cron-like scheduling (simplified for demonstration)
      const shouldRun = this.shouldRunMaintenanceTask(task, now);

      if (shouldRun) {
        try {
          logger.info(`Running maintenance task: ${name}`);
          await task.action();
          task.lastRun = now;
          task.nextRun = this.calculateNextRun(task.schedule, now);
          logger.info(`Completed maintenance task: ${name}`);
        } catch (error) {
          logger.error(`Failed to run maintenance task ${name}:`, error);
        }
      }
    }
  }

  private async analyzeAllTables(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get all tables that need analyzing
      const tablesResult = await client.query(`
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      `);

      for (const row of tablesResult.rows) {
        const tableName = `"${row.schemaname}"."${row.tablename}"`;
        try {
          await client.query(`ANALYZE ${tableName}`);
        } catch (error) {
          logger.warn(`Failed to analyze table ${tableName}:`, error);
        }
      }

      logger.info(`Analyzed ${tablesResult.rows.length} tables`);
    } finally {
      client.release();
    }
  }

  private async vacuumAnalyzeTables(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get tables with high dead tuple ratios
      const tablesResult = await client.query(`
        SELECT schemaname, tablename,
               n_dead_tup::float / GREATEST(n_live_tup + n_dead_tup, 1) as dead_ratio
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000 OR n_dead_tup::float / GREATEST(n_live_tup + n_dead_tup, 1) > 0.1
        ORDER BY dead_ratio DESC
        LIMIT 20
      `);

      for (const row of tablesResult.rows) {
        const tableName = `"${row.schemaname}"."${row.tablename}"`;
        try {
          await client.query(`VACUUM ANALYZE ${tableName}`);
          logger.info(
            `Vacuumed table ${tableName} (dead ratio: ${(row.dead_ratio * 100).toFixed(1)}%)`,
          );
        } catch (error) {
          logger.warn(`Failed to vacuum table ${tableName}:`, error);
        }
      }
    } finally {
      client.release();
    }
  }

  private async reindexFragmentedIndexes(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Find fragmented indexes (this is a simplified check)
      const indexResult = await client.query(`
        SELECT schemaname, tablename, indexname,
               pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan < 100 AND pg_relation_size(indexrelid) > 10485760 -- 10MB
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 10
      `);

      for (const row of indexResult.rows) {
        const indexName = `"${row.schemaname}"."${row.indexname}"`;
        try {
          await client.query(`REINDEX INDEX ${indexName}`);
          logger.info(`Reindexed ${indexName} (size: ${row.index_size})`);
        } catch (error) {
          logger.warn(`Failed to reindex ${indexName}:`, error);
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * 📈 Performance monitoring and metrics
   */
  private initializeMonitoring(): void {
    // Enable query logging for slow queries
    this.pool.on('connect', (client) => {
      client.query('SET log_min_duration_statement = 1000'); // Log queries > 1s
      client.query('SET log_statement_stats = on');
    });
  }

  private startConnectionPoolMonitoring(): void {
    setInterval(async () => {
      const metrics = this.getConnectionPoolMetrics();
      this.emit('connectionPoolMetrics', metrics);

      // Alert on pool exhaustion
      if (metrics.idleConnections === 0 && metrics.waitingClients > 0) {
        this.emit('connectionPoolExhausted', metrics);
        logger.warn('Connection pool exhausted', metrics);
      }
    }, this.CONNECTION_POOL_MONITOR_INTERVAL);
  }

  private getConnectionPoolMetrics(): ConnectionPoolMetrics {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * 🚀 Utility methods for query optimization
   */
  private shouldAnalyzeQuery(query: string): boolean {
    const queryLower = query.toLowerCase();

    // Analyze complex queries
    if (queryLower.includes('join') && queryLower.includes('where'))
      return true;
    if (queryLower.includes('order by') && queryLower.includes('limit'))
      return true;
    if (queryLower.includes('group by')) return true;
    if (queryLower.includes('union')) return true;
    if (queryLower.includes('exists') || queryLower.includes('in (select'))
      return true;

    return false;
  }

  private calculateQueryTimeout(query: string): number {
    const baseTimeout = 30000; // 30 seconds
    const queryLower = query.toLowerCase();

    let multiplier = 1;
    if (queryLower.includes('join')) multiplier += 0.5;
    if (queryLower.includes('group by')) multiplier += 0.3;
    if (queryLower.includes('order by')) multiplier += 0.2;
    if (queryLower.includes('union')) multiplier += 0.4;

    return Math.min(baseTimeout * multiplier, 300000); // Max 5 minutes
  }

  private async executeWithTimeout<T = any>(
    client: PoolClient,
    query: string,
    parameters: any[],
    timeout: number,
  ): Promise<QueryResult<T>> {
    return Promise.race([
      client.query<T>(query, parameters),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout exceeded')), timeout),
      ),
    ]);
  }

  private shouldCacheResult(
    query: string,
    executionTime: number,
    result: QueryResult,
  ): boolean {
    // Don't cache write operations
    const queryLower = query.toLowerCase();
    if (
      queryLower.includes('insert') ||
      queryLower.includes('update') ||
      queryLower.includes('delete')
    ) {
      return false;
    }

    // Cache slow queries
    if (executionTime > 2000) return true;

    // Cache queries with many results
    if (result.rowCount && result.rowCount > 100) return true;

    // Cache queries with complex operations
    if (queryLower.includes('join') || queryLower.includes('group by'))
      return true;

    return false;
  }

  private calculateCacheTtl(query: string, executionTime: number): number {
    let ttl = 300; // 5 minutes base

    // Longer TTL for expensive queries
    if (executionTime > 10000)
      ttl *= 4; // 20 minutes
    else if (executionTime > 5000) ttl *= 2; // 10 minutes

    // Shorter TTL for data that changes frequently
    const queryLower = query.toLowerCase();
    if (queryLower.includes('recent') || queryLower.includes('today')) {
      ttl = Math.min(ttl, 120); // Max 2 minutes
    }

    return ttl;
  }

  /**
   * 🔍 Query parsing utilities
   */
  private extractTablesFromPlan(
    plan: any,
    tables: Set<string> = new Set(),
  ): string[] {
    if (plan['Relation Name']) {
      tables.add(plan['Relation Name']);
    }

    if (plan.Plans) {
      for (const subPlan of plan.Plans) {
        this.extractTablesFromPlan(subPlan, tables);
      }
    }

    return Array.from(tables);
  }

  private extractFilterColumns(query: string, table: string): string[] {
    // Simplified column extraction - production would use a SQL parser
    const columns: string[] = [];
    const regex = new RegExp(`${table}\\.(\\w+)\\s*[=<>!]`, 'gi');
    let match;

    while ((match = regex.exec(query)) !== null) {
      columns.push(match[1]);
    }

    return columns;
  }

  private extractFilterColumnsFromWhere(
    whereClause: string,
  ): Array<{ table: string; column: string; operator: string }> {
    const columns: Array<{ table: string; column: string; operator: string }> =
      [];

    // Simplified parsing - production would use proper SQL parser
    const patterns = [
      /(\w+)\.(\w+)\s*(=|!=|<|>|<=|>=|LIKE|ILIKE)\s*/gi,
      /(\w+)\s*(=|!=|<|>|<=|>=|LIKE|ILIKE)\s*/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(whereClause)) !== null) {
        if (match[3]) {
          // Table.column pattern
          columns.push({
            table: match[1],
            column: match[2],
            operator: match[3].toLowerCase(),
          });
        } else {
          // column pattern (assume main table)
          columns.push({
            table: 'main',
            column: match[1],
            operator: match[2].toLowerCase(),
          });
        }
      }
    });

    return columns;
  }

  private extractOrderByColumns(orderByClause: string): string[] {
    const columns: string[] = [];
    const parts = orderByClause.split(',');

    parts.forEach((part) => {
      const match = part.trim().match(/^(\w+(?:\.\w+)?)/);
      if (match) {
        const column = match[1].includes('.')
          ? match[1].split('.')[1]
          : match[1];
        columns.push(column);
      }
    });

    return columns;
  }

  private extractMainTable(query: string): string {
    const fromMatch = query.match(/from\s+(\w+)/i);
    return fromMatch ? fromMatch[1] : 'unknown';
  }

  private extractJoinColumns(joinCondition: string): string[] {
    const columns: string[] = [];
    const matches = joinCondition.matchAll(/(\w+)\.(\w+)/g);

    for (const match of matches) {
      columns.push(match[2]);
    }

    return columns;
  }

  /**
   * 🗄️ Caching and statistics
   */
  private generateQueryHash(query: string, parameters: any[]): string {
    const normalized = query.toLowerCase().replace(/\s+/g, ' ').trim();
    const paramStr = JSON.stringify(parameters);
    return createHash('md5')
      .update(normalized + paramStr)
      .digest('hex');
  }

  private async getCachedResult<T = any>(
    queryHash: string,
  ): Promise<QueryResult<T> | null> {
    if (!this.redis) return null;

    const cached = await this.redis.get(`postgres:query:${queryHash}`);
    if (!cached) return null;

    try {
      return JSON.parse(cached) as QueryResult<T>;
    } catch (error) {
      logger.warn('Failed to parse cached query result', { queryHash });
      await this.redis.del(`postgres:query:${queryHash}`);
      return null;
    }
  }

  private async cacheResult(
    queryHash: string,
    result: QueryResult,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      // Only cache the essential parts of the result
      const cacheData = {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command,
        fields: result.fields,
      };

      await this.redis.setex(
        `postgres:query:${queryHash}`,
        ttlSeconds,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      logger.warn('Failed to cache query result', {
        queryHash,
        error: error.message,
      });
    }
  }

  private async logSlowQuery(
    query: string,
    parameters: any[],
    duration: number,
    queryHash: string,
  ): Promise<void> {
    const slowQuery: SlowQueryLog = {
      query,
      duration,
      timestamp: Date.now(),
      parameters,
      queryHash,
    };

    this.slowQueries.push(slowQuery);

    // Keep only recent slow queries (last 1000)
    if (this.slowQueries.length > 1000) {
      this.slowQueries = this.slowQueries.slice(-1000);
    }

    this.emit('slowQuery', slowQuery);
    logger.warn('Slow query detected', {
      duration,
      queryHash,
      query: query.substring(0, 200),
    });
  }

  private async updateQueryStats(
    queryHash: string,
    executionTime: number,
    rowCount?: number,
  ): Promise<void> {
    if (!this.redis) return;

    const statsKey = `postgres:stats:${queryHash}`;
    const stats = await this.redis.get(statsKey);

    let queryStats;
    if (stats) {
      queryStats = JSON.parse(stats);
      queryStats.count += 1;
      queryStats.totalTime += executionTime;
      queryStats.avgTime = queryStats.totalTime / queryStats.count;
      queryStats.maxTime = Math.max(queryStats.maxTime, executionTime);
      queryStats.minTime = Math.min(queryStats.minTime, executionTime);
      queryStats.lastExecuted = Date.now();
      if (rowCount !== undefined) {
        queryStats.totalRows += rowCount;
        queryStats.avgRows = queryStats.totalRows / queryStats.count;
      }
    } else {
      queryStats = {
        count: 1,
        totalTime: executionTime,
        avgTime: executionTime,
        maxTime: executionTime,
        minTime: executionTime,
        totalRows: rowCount || 0,
        avgRows: rowCount || 0,
        firstExecuted: Date.now(),
        lastExecuted: Date.now(),
      };
    }

    await this.redis.setex(statsKey, 86400, JSON.stringify(queryStats)); // 24h TTL
  }

  /**
   * 🔧 Maintenance scheduling utilities
   */
  private shouldRunMaintenanceTask(
    task: MaintenanceTask,
    now: number,
  ): boolean {
    // Simplified cron-like scheduling
    if (task.lastRun === 0) return true; // First run

    const hoursSinceLastRun = (now - task.lastRun) / (1000 * 60 * 60);

    // Parse simple schedule patterns
    if (task.schedule === '0 2 * * *') {
      // Daily at 2 AM
      return hoursSinceLastRun >= 24;
    }
    if (task.schedule === '0 3 * * 0') {
      // Weekly on Sunday at 3 AM
      return hoursSinceLastRun >= 168; // 7 days
    }
    if (task.schedule === '0 1 * * 0') {
      // Weekly on Sunday at 1 AM
      return hoursSinceLastRun >= 168;
    }
    if (task.schedule === '0 0 * * *') {
      // Daily at midnight
      return hoursSinceLastRun >= 24;
    }
    if (task.schedule === '*/30 * * * *') {
      // Every 30 minutes
      return hoursSinceLastRun >= 0.5;
    }

    return false;
  }

  private calculateNextRun(schedule: string, now: number): number {
    // Simplified - production would use a proper cron library
    return now + 24 * 60 * 60 * 1000; // Default to 24 hours
  }

  private async cleanSlowQueryLog(): Promise<void> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.slowQueries = this.slowQueries.filter(
      (query) => query.timestamp > oneDayAgo,
    );
    logger.info(
      `Cleaned slow query log, ${this.slowQueries.length} entries remaining`,
    );
  }

  private async updateTableStatistics(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Update statistics for active tables
      await client.query(`
        SELECT pg_stat_reset();
      `);
    } finally {
      client.release();
    }
  }

  /**
   * 📊 Public API methods for getting performance insights
   */
  async getPerformanceReport(): Promise<{
    slowQueries: SlowQueryLog[];
    indexRecommendations: IndexRecommendation[];
    connectionPoolMetrics: ConnectionPoolMetrics;
    queryStats: any;
  }> {
    const queryStats = await this.getAggregatedQueryStats();

    return {
      slowQueries: this.slowQueries.slice(-50), // Last 50 slow queries
      indexRecommendations: this.indexRecommendations
        .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
        .slice(0, 20), // Top 20 recommendations
      connectionPoolMetrics: this.getConnectionPoolMetrics(),
      queryStats,
    };
  }

  private async getAggregatedQueryStats(): Promise<any> {
    if (!this.redis) return {};

    const keys = await this.redis.keys('postgres:stats:*');
    const stats = [];

    for (const key of keys.slice(0, 100)) {
      // Limit to 100 most recent
      const data = await this.redis.get(key);
      if (data) {
        stats.push(JSON.parse(data));
      }
    }

    return {
      totalQueries: stats.reduce((sum, s) => sum + s.count, 0),
      avgExecutionTime:
        stats.reduce((sum, s) => sum + s.avgTime, 0) / stats.length || 0,
      slowestQuery: Math.max(...stats.map((s) => s.maxTime), 0),
      mostFrequentQueries: stats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((s) => ({
          count: s.count,
          avgTime: s.avgTime,
          maxTime: s.maxTime,
        })),
    };
  }

  async createRecommendedIndexes(limit: number = 5): Promise<string[]> {
    const client = await this.pool.connect();
    const createdIndexes: string[] = [];

    try {
      const topRecommendations = this.indexRecommendations
        .filter((r) => r.priority === 'high')
        .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
        .slice(0, limit);

      for (const rec of topRecommendations) {
        const indexName = `idx_${rec.table}_${rec.columns.join('_')}_auto`;
        const createIndexSQL = `
          CREATE INDEX CONCURRENTLY ${indexName}
          ON ${rec.table} USING ${rec.indexType} (${rec.columns.join(', ')})
        `;

        try {
          await client.query(createIndexSQL);
          createdIndexes.push(indexName);
          logger.info(`Created recommended index: ${indexName}`, {
            reason: rec.reason,
          });
        } catch (error) {
          logger.warn(`Failed to create index ${indexName}:`, error);
        }
      }
    } finally {
      client.release();
    }

    return createdIndexes;
  }

  /**
   * 🧹 Cache and cleanup methods
   */
  async clearQueryCache(pattern?: string): Promise<void> {
    if (!this.redis) return;

    const searchPattern = pattern
      ? `postgres:query:*${pattern}*`
      : 'postgres:query:*';
    const keys = await this.redis.keys(searchPattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info(
        `Cleared ${keys.length} cached queries matching pattern: ${searchPattern}`,
      );
    }
  }

  async getCacheStats(): Promise<any> {
    if (!this.redis) return { available: false };

    const queryKeys = await this.redis.keys('postgres:query:*');
    const statsKeys = await this.redis.keys('postgres:stats:*');

    return {
      available: true,
      queryCache: {
        entries: queryKeys.length,
        memoryUsage: 'N/A', // Would need Redis MEMORY command
      },
      queryStats: {
        entries: statsKeys.length,
      },
      slowQueries: this.slowQueries.length,
      indexRecommendations: this.indexRecommendations.length,
    };
  }
}
