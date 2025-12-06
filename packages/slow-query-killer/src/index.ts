/**
 * @intelgraph/slow-query-killer
 *
 * Slow query killer with cost budgeting and graceful degradation.
 * Monitors query execution time and kills queries that exceed budgets.
 */

import EventEmitter from 'events';

export interface QueryBudget {
  /** Maximum query execution time in milliseconds */
  maxExecutionTimeMs: number;
  /** Maximum estimated cost in dollars */
  maxCostDollars: number;
  /** Soft warning threshold (percentage of max) */
  softThreshold: number;
  /** Whether to kill queries or just warn */
  killEnabled: boolean;
}

export interface TenantQueryBudget extends QueryBudget {
  /** Tenant identifier */
  tenantId: string;
  /** Maximum concurrent queries */
  maxConcurrentQueries?: number;
  /** Query complexity limit (for graph queries) */
  maxComplexity?: number;
}

export interface QueryContext {
  /** Unique query identifier */
  queryId: string;
  /** Tenant identifier */
  tenantId: string;
  /** Database type */
  database: 'neo4j' | 'postgres' | 'redis';
  /** Query text (for logging) */
  query: string;
  /** Query parameters */
  params?: Record<string, any>;
  /** Estimated cost in dollars */
  estimatedCost: number;
  /** Query complexity score (0-100) */
  complexity?: number;
  /** Start time */
  startTime: Date;
}

export interface QueryKillResult {
  /** Whether query was killed */
  killed: boolean;
  /** Reason for kill */
  reason?: string;
  /** Execution time before kill (ms) */
  executionTimeMs: number;
  /** Cost incurred before kill */
  costIncurred: number;
}

/**
 * SlowQueryKiller - Monitors and kills slow/expensive queries
 */
export class SlowQueryKiller extends EventEmitter {
  private runningQueries = new Map<string, QueryContext>();
  private tenantBudgets = new Map<string, TenantQueryBudget>();
  private defaultBudget: QueryBudget;
  private checkInterval: NodeJS.Timeout | null = null;

  // Statistics
  private stats = {
    totalQueries: 0,
    killedQueries: 0,
    warningsIssued: 0,
    totalCostSaved: 0,
    killsByReason: {} as Record<string, number>,
  };

  constructor(defaultBudget: QueryBudget) {
    super();
    this.defaultBudget = defaultBudget;
    this.startMonitoring();
  }

  /**
   * Set budget for a specific tenant
   */
  setTenantBudget(tenantId: string, budget: Partial<TenantQueryBudget>): void {
    const existingBudget = this.tenantBudgets.get(tenantId);
    const mergedBudget: TenantQueryBudget = {
      ...this.defaultBudget,
      ...existingBudget,
      ...budget,
      tenantId,
    };

    this.tenantBudgets.set(tenantId, mergedBudget);
    this.emit('tenant_budget_set', { tenantId, budget: mergedBudget });
  }

  /**
   * Get budget for tenant (falls back to default)
   */
  private getBudget(tenantId: string): TenantQueryBudget {
    return (
      this.tenantBudgets.get(tenantId) || {
        ...this.defaultBudget,
        tenantId,
      }
    );
  }

  /**
   * Register a query for monitoring
   */
  registerQuery(context: QueryContext): void {
    const budget = this.getBudget(context.tenantId);

    // Check concurrent query limit
    const tenantQueries = Array.from(this.runningQueries.values()).filter(
      (q) => q.tenantId === context.tenantId
    );

    if (
      budget.maxConcurrentQueries &&
      tenantQueries.length >= budget.maxConcurrentQueries
    ) {
      this.emit('concurrent_limit_exceeded', {
        tenantId: context.tenantId,
        limit: budget.maxConcurrentQueries,
        current: tenantQueries.length,
      });
    }

    // Check complexity limit
    if (
      budget.maxComplexity &&
      context.complexity &&
      context.complexity > budget.maxComplexity
    ) {
      this.emit('complexity_limit_exceeded', {
        tenantId: context.tenantId,
        limit: budget.maxComplexity,
        actual: context.complexity,
        queryId: context.queryId,
      });
    }

    this.runningQueries.set(context.queryId, context);
    this.stats.totalQueries++;

    this.emit('query_registered', {
      queryId: context.queryId,
      tenantId: context.tenantId,
      database: context.database,
    });
  }

  /**
   * Unregister a completed query
   */
  unregisterQuery(queryId: string): void {
    this.runningQueries.delete(queryId);
  }

  /**
   * Check if a query should be killed
   */
  shouldKillQuery(queryId: string): QueryKillResult {
    const context = this.runningQueries.get(queryId);
    if (!context) {
      return {
        killed: false,
        executionTimeMs: 0,
        costIncurred: 0,
      };
    }

    const budget = this.getBudget(context.tenantId);
    const executionTimeMs = Date.now() - context.startTime.getTime();
    const costIncurred = this.calculateCostIncurred(context, executionTimeMs);

    // Check execution time
    if (executionTimeMs > budget.maxExecutionTimeMs) {
      const softThresholdMs =
        budget.maxExecutionTimeMs * budget.softThreshold;

      if (executionTimeMs > softThresholdMs && budget.killEnabled) {
        return {
          killed: true,
          reason: `Exceeded max execution time: ${executionTimeMs}ms > ${budget.maxExecutionTimeMs}ms`,
          executionTimeMs,
          costIncurred,
        };
      }
    }

    // Check cost
    if (costIncurred > budget.maxCostDollars) {
      const softThresholdCost = budget.maxCostDollars * budget.softThreshold;

      if (costIncurred > softThresholdCost && budget.killEnabled) {
        return {
          killed: true,
          reason: `Exceeded max cost: $${costIncurred.toFixed(4)} > $${budget.maxCostDollars.toFixed(4)}`,
          executionTimeMs,
          costIncurred,
        };
      }
    }

    // Issue warning if approaching limits
    const timePercentage =
      (executionTimeMs / budget.maxExecutionTimeMs) * 100;
    const costPercentage = (costIncurred / budget.maxCostDollars) * 100;

    if (
      timePercentage > budget.softThreshold * 100 ||
      costPercentage > budget.softThreshold * 100
    ) {
      this.stats.warningsIssued++;
      this.emit('query_warning', {
        queryId,
        tenantId: context.tenantId,
        executionTimeMs,
        costIncurred,
        timePercentage,
        costPercentage,
      });
    }

    return {
      killed: false,
      executionTimeMs,
      costIncurred,
    };
  }

  /**
   * Kill a specific query
   */
  async killQuery(
    queryId: string,
    database: 'neo4j' | 'postgres' | 'redis',
    connectionHandle: any
  ): Promise<boolean> {
    const context = this.runningQueries.get(queryId);
    if (!context) {
      return false;
    }

    try {
      switch (database) {
        case 'neo4j':
          await this.killNeo4jQuery(queryId, connectionHandle);
          break;
        case 'postgres':
          await this.killPostgresQuery(queryId, connectionHandle);
          break;
        case 'redis':
          // Redis doesn't have long-running queries typically
          // but we can close the connection
          await this.killRedisCommand(queryId, connectionHandle);
          break;
      }

      const executionTimeMs = Date.now() - context.startTime.getTime();
      const costIncurred = this.calculateCostIncurred(context, executionTimeMs);

      this.stats.killedQueries++;
      this.stats.totalCostSaved += context.estimatedCost - costIncurred;

      const reason = this.shouldKillQuery(queryId).reason || 'Manual kill';
      this.stats.killsByReason[reason] =
        (this.stats.killsByReason[reason] || 0) + 1;

      this.emit('query_killed', {
        queryId,
        tenantId: context.tenantId,
        database: context.database,
        reason,
        executionTimeMs,
        costIncurred,
        costSaved: context.estimatedCost - costIncurred,
      });

      this.unregisterQuery(queryId);
      return true;
    } catch (error) {
      this.emit('kill_error', {
        queryId,
        database,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Get running queries (optionally filtered by tenant)
   */
  getRunningQueries(tenantId?: string): QueryContext[] {
    const queries = Array.from(this.runningQueries.values());

    if (tenantId) {
      return queries.filter((q) => q.tenantId === tenantId);
    }

    return queries;
  }

  /**
   * Get tenant query budget
   */
  getTenantBudget(tenantId: string): TenantQueryBudget | undefined {
    return this.tenantBudgets.get(tenantId);
  }

  /**
   * Clear all tenant budgets
   */
  clearTenantBudgets(): void {
    this.tenantBudgets.clear();
    this.emit('budgets_cleared');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Start monitoring running queries
   */
  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      for (const [queryId, _context] of this.runningQueries.entries()) {
        const result = this.shouldKillQuery(queryId);

        if (result.killed) {
          // Emit event for external handler to kill the query
          // (we can't kill directly without database connection handle)
          this.emit('should_kill_query', {
            queryId,
            reason: result.reason,
            executionTimeMs: result.executionTimeMs,
            costIncurred: result.costIncurred,
          });
        }
      }
    }, 1000); // Check every second
  }

  /**
   * Calculate cost incurred so far
   */
  private calculateCostIncurred(
    context: QueryContext,
    executionTimeMs: number
  ): number {
    // Simple linear interpolation based on execution time
    // Actual cost would be measured, but this is an estimate
    const estimatedTotalTime = context.estimatedCost * 10000; // Assume $0.0001 per 1ms
    const progress = Math.min(executionTimeMs / estimatedTotalTime, 1);
    return context.estimatedCost * progress;
  }

  /**
   * Kill Neo4j query
   */
  private async killNeo4jQuery(
    queryId: string,
    driver: any
  ): Promise<void> {
    const session = driver.session();
    try {
      // Neo4j CALL dbms.listQueries() and CALL dbms.killQuery()
      await session.run('CALL dbms.killQuery($queryId)', { queryId });
    } finally {
      await session.close();
    }
  }

  /**
   * Kill PostgreSQL query
   */
  private async killPostgresQuery(
    processId: string,
    client: any
  ): Promise<void> {
    // PostgreSQL pg_cancel_backend() or pg_terminate_backend()
    await client.query('SELECT pg_cancel_backend($1)', [processId]);
  }

  /**
   * Kill Redis command (close connection)
   */
  private async killRedisCommand(
    _queryId: string,
    client: any
  ): Promise<void> {
    // Redis doesn't have long-running queries, but we can disconnect
    await client.quit();
  }
}

/**
 * Query complexity analyzer for graph queries
 */
export class QueryComplexityAnalyzer {
  /**
   * Analyze Cypher query complexity
   */
  static analyzeCypherComplexity(cypher: string): number {
    let complexity = 0;

    // Pattern matching complexity
    const matchCount = (cypher.match(/MATCH/gi) || []).length;
    complexity += matchCount * 5;

    // Optional match is more expensive
    const optionalMatchCount = (cypher.match(/OPTIONAL\s+MATCH/gi) || [])
      .length;
    complexity += optionalMatchCount * 10;

    // Cartesian products (multiple patterns in same MATCH)
    const commas = (cypher.match(/,/g) || []).length;
    complexity += commas * 3;

    // Aggregations
    const aggregations = (
      cypher.match(/\b(count|sum|avg|max|min|collect)\s*\(/gi) || []
    ).length;
    complexity += aggregations * 5;

    // Sorting
    if (/ORDER\s+BY/i.test(cypher)) {
      complexity += 5;
    }

    // Pagination (offset is expensive)
    if (/SKIP/i.test(cypher)) {
      complexity += 3;
    }

    // Variable length paths
    const varLengthPaths = (cypher.match(/\[\*\d*\.\.\d*\]/g) || []).length;
    complexity += varLengthPaths * 15;

    // Unbounded variable length paths (very expensive!)
    const unboundedPaths = (cypher.match(/\[\*\]/g) || []).length;
    complexity += unboundedPaths * 50;

    // MERGE is more expensive than CREATE
    const mergeCount = (cypher.match(/MERGE/gi) || []).length;
    complexity += mergeCount * 8;

    // DELETE operations
    const deleteCount = (cypher.match(/DELETE|DETACH\s+DELETE/gi) || [])
      .length;
    complexity += deleteCount * 5;

    // Subqueries
    const subqueryCount = (cypher.match(/CALL\s*\{/gi) || []).length;
    complexity += subqueryCount * 10;

    return Math.min(complexity, 100); // Cap at 100
  }

  /**
   * Analyze SQL query complexity
   */
  static analyzeSQLComplexity(sql: string): number {
    let complexity = 0;

    // JOIN complexity
    const joinCount = (sql.match(/\b(INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\b/gi) || []).length;
    complexity += joinCount * 5;

    // Subqueries
    const subqueryCount = (sql.match(/\(\s*SELECT/gi) || []).length;
    complexity += subqueryCount * 10;

    // Aggregations
    const aggregations = (sql.match(/\b(COUNT|SUM|AVG|MAX|MIN|GROUP_CONCAT)\s*\(/gi) || []).length;
    complexity += aggregations * 3;

    // GROUP BY
    if (/GROUP\s+BY/i.test(sql)) {
      complexity += 5;
    }

    // HAVING clauses
    if (/HAVING/i.test(sql)) {
      complexity += 3;
    }

    // UNION operations
    const unionCount = (sql.match(/UNION/gi) || []).length;
    complexity += unionCount * 8;

    // Window functions
    const windowFunctions = (sql.match(/OVER\s*\(/gi) || []).length;
    complexity += windowFunctions * 10;

    // CTEs (WITH clauses)
    const cteCount = (sql.match(/WITH\s+\w+\s+AS/gi) || []).length;
    complexity += cteCount * 7;

    return Math.min(complexity, 100);
  }
}

/**
 * Cost estimator for database queries
 */
export class QueryCostEstimator {
  /**
   * Estimate Neo4j query cost
   */
  static estimateNeo4jCost(
    cypher: string,
    estimatedResultCount: number = 100
  ): number {
    const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(cypher);

    // Base cost per result
    const baseCostPerResult = 0.00001; // $0.00001 per result

    // Complexity multiplier (1x to 5x)
    const complexityMultiplier = 1 + (complexity / 100) * 4;

    return (
      baseCostPerResult * estimatedResultCount * complexityMultiplier
    );
  }

  /**
   * Estimate PostgreSQL query cost
   */
  static estimatePostgresCost(
    sql: string,
    estimatedRows: number = 1000
  ): number {
    const complexity = QueryComplexityAnalyzer.analyzeSQLComplexity(sql);

    const baseCostPerRow = 0.000001; // $0.000001 per row

    const complexityMultiplier = 1 + (complexity / 100) * 3;

    return baseCostPerRow * estimatedRows * complexityMultiplier;
  }
}

/**
 * Create Express/Fastify middleware for query budget enforcement
 */
export function createQueryBudgetMiddleware(killer: SlowQueryKiller) {
  return async (req: any, res: any, next: any) => {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const budget = killer.getTenantBudget(tenantId);

    if (budget) {
      const runningQueries = killer.getRunningQueries(tenantId);

      if (
        budget.maxConcurrentQueries &&
        runningQueries.length >= budget.maxConcurrentQueries
      ) {
        return res.status(429).json({
          error: 'Too many concurrent queries',
          limit: budget.maxConcurrentQueries,
          current: runningQueries.length,
        });
      }
    }

    next();
  };
}

export default SlowQueryKiller;
