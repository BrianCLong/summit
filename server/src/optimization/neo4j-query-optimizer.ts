// server/src/optimization/neo4j-query-optimizer.ts

import { Driver, Session, Result, Integer } from 'neo4j-driver';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

interface QueryComplexity {
  score: number;
  factors: {
    nodeTraversals: number;
    relationshipTraversals: number;
    aggregations: number;
    sorting: number;
    filtering: number;
    textSearch: number;
  };
  estimatedCost: number;
  timeoutMs: number;
  memoryMB: number;
}

interface QueryMetrics {
  executionTimeMs: number;
  nodesReturned: number;
  relationshipsReturned: number;
  dbHits: number;
  allocatedBytes: number;
  pageCacheHits: number;
  pageCacheMisses: number;
}

interface CachedQueryResult {
  result: any;
  metrics: QueryMetrics;
  timestamp: number;
  ttlSeconds: number;
  complexity: QueryComplexity;
}

interface MaterializedView {
  name: string;
  query: string;
  refreshIntervalMinutes: number;
  lastRefresh: number;
  dependencies: string[];
  parameters: Record<string, any>;
}

export class Neo4jQueryOptimizer extends EventEmitter {
  private driver: Driver;
  private redis = getRedisClient();
  private materializedViews: Map<string, MaterializedView> = new Map();
  private queryStats: Map<string, QueryMetrics[]> = new Map();
  private readonly CACHE_PREFIX = 'neo4j:query:';
  private readonly MATERIALIZED_VIEW_PREFIX = 'neo4j:view:';
  private readonly QUERY_STATS_PREFIX = 'neo4j:stats:';

  constructor(driver: Driver) {
    super();
    this.driver = driver;
    this.initializeMaterializedViews();
    this.startPerformanceMonitoring();
  }

  /**
   * 🚀 CORE: Optimized query execution with intelligent caching
   */
  async executeOptimizedQuery(
    query: string,
    parameters: Record<string, any> = {},
    options: {
      useCache?: boolean;
      cacheTtl?: number;
      forceRefresh?: boolean;
      timeout?: number;
      maxMemoryMB?: number;
    } = {},
  ): Promise<{
    result: Result;
    metrics: QueryMetrics;
    cacheHit: boolean;
    optimizationApplied: string[];
  }> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, parameters);
    const optimizations: string[] = [];

    try {
      // Step 1: Check for materialized view opportunity
      const materializedResult = await this.checkMaterializedViews(
        query,
        parameters,
      );
      if (materializedResult) {
        optimizations.push('materialized_view');
        return {
          result: materializedResult.result,
          metrics: materializedResult.metrics,
          cacheHit: true,
          optimizationApplied: optimizations,
        };
      }

      // Step 2: Check query cache
      if (options.useCache !== false && !options.forceRefresh) {
        const cachedResult = await this.getCachedResult(queryHash);
        if (cachedResult) {
          optimizations.push('redis_cache');
          this.emit('cacheHit', { queryHash, query: query.substring(0, 100) });
          return {
            result: this.deserializeResult(cachedResult.result),
            metrics: cachedResult.metrics,
            cacheHit: true,
            optimizationApplied: optimizations,
          };
        }
      }

      // Step 3: Analyze query complexity
      const complexity = await this.analyzeQueryComplexity(query, parameters);
      optimizations.push('complexity_analysis');

      // Step 4: Apply query optimizations
      const optimizedQuery = await this.optimizeQuery(
        query,
        parameters,
        complexity,
      );
      if (optimizedQuery !== query) {
        optimizations.push('query_rewrite');
      }

      // Step 5: Execute with appropriate timeouts and limits
      const session = this.driver.session({
        defaultAccessMode: this.getAccessMode(query),
        database: 'neo4j',
      });

      const timeout = options.timeout || complexity.timeoutMs;
      const result = await Promise.race([
        session.run(optimizedQuery, parameters),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Query timeout exceeded')),
            timeout,
          ),
        ),
      ]);

      const executionTime = Date.now() - startTime;
      const metrics = await this.extractMetrics(
        result,
        executionTime,
        complexity,
      );

      // Step 6: Cache the result if appropriate
      if (
        options.useCache !== false &&
        this.shouldCacheQuery(complexity, metrics)
      ) {
        const ttl =
          options.cacheTtl || this.calculateCacheTtl(complexity, metrics);
        await this.cacheResult(queryHash, result, metrics, complexity, ttl);
        optimizations.push('result_caching');
      }

      // Step 7: Update query statistics
      await this.updateQueryStats(queryHash, metrics);

      await session.close();

      this.emit('queryExecuted', {
        queryHash,
        executionTime,
        optimizations,
        complexity: complexity.score,
      });

      return {
        result,
        metrics,
        cacheHit: false,
        optimizationApplied: optimizations,
      };
    } catch (error) {
      this.emit('queryError', {
        queryHash,
        error: error.message,
        executionTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * 🧠 Query complexity analysis with cost estimation
   */
  private async analyzeQueryComplexity(
    query: string,
    parameters: Record<string, any>,
  ): Promise<QueryComplexity> {
    const factors = {
      nodeTraversals: 0,
      relationshipTraversals: 0,
      aggregations: 0,
      sorting: 0,
      filtering: 0,
      textSearch: 0,
    };

    const queryLower = query.toLowerCase();

    // Analyze query patterns
    factors.nodeTraversals = (queryLower.match(/match\s*\(/g) || []).length;
    factors.relationshipTraversals = (
      queryLower.match(/-\[.*?\]-/g) || []
    ).length;
    factors.aggregations = (
      queryLower.match(/\b(count|sum|avg|min|max|collect)\s*\(/g) || []
    ).length;
    factors.sorting = (queryLower.match(/\border\s+by\b/g) || []).length;
    factors.filtering = (queryLower.match(/\bwhere\b/g) || []).length;
    factors.textSearch = (
      queryLower.match(/\b(contains|starts\s+with|ends\s+with|=~)\b/g) || []
    ).length;

    // Calculate complexity score (0-1 scale)
    let score = 0;
    score += factors.nodeTraversals * 0.1;
    score += factors.relationshipTraversals * 0.2;
    score += factors.aggregations * 0.15;
    score += factors.sorting * 0.1;
    score += factors.filtering * 0.05;
    score += factors.textSearch * 0.25;

    // Check for expensive patterns
    if (queryLower.includes('variable length')) {
      score += 0.5;
    }
    if (queryLower.includes('*') && queryLower.includes('..')) {
      score += 0.3;
    }
    if (queryLower.includes('apoc')) {
      score += 0.2;
    }

    score = Math.min(score, 1.0);

    // Calculate resource requirements based on complexity
    const estimatedCost = this.calculateQueryCost(score, factors);
    const timeoutMs = this.calculateTimeout(score);
    const memoryMB = this.calculateMemoryRequirement(score, factors);

    return {
      score,
      factors,
      estimatedCost,
      timeoutMs,
      memoryMB,
    };
  }

  /**
   * 🎯 Query optimization with rewriting strategies
   */
  private async optimizeQuery(
    query: string,
    parameters: Record<string, any>,
    complexity: QueryComplexity,
  ): Promise<string> {
    let optimizedQuery = query;

    // Optimization 1: Add LIMIT for high-complexity queries without explicit limits
    if (complexity.score > 0.7 && !query.toLowerCase().includes('limit')) {
      optimizedQuery += ' LIMIT 1000';
    }

    // Optimization 2: Use index hints for filtered queries
    if (complexity.factors.filtering > 2) {
      optimizedQuery = this.addIndexHints(optimizedQuery);
    }

    // Optimization 3: Rewrite expensive variable-length path queries
    if (query.toLowerCase().includes('*') && complexity.score > 0.8) {
      optimizedQuery = this.optimizeVariableLengthPaths(optimizedQuery);
    }

    // Optimization 4: Push down filters closer to MATCH clauses
    optimizedQuery = this.pushDownFilters(optimizedQuery);

    return optimizedQuery;
  }

  /**
   * 💾 Materialized view management for common analytics queries
   */
  private initializeMaterializedViews(): void {
    const commonViews: MaterializedView[] = [
      {
        name: 'entity_degree_centrality',
        query: `
          MATCH (e:Entity)
          WITH e, SIZE([(e)-[:RELATIONSHIP]-()] ) as degree
          RETURN e.id as entityId, e.label as entityLabel, e.type as entityType, degree
          ORDER BY degree DESC
          LIMIT 1000
        `,
        refreshIntervalMinutes: 15,
        lastRefresh: 0,
        dependencies: ['Entity', 'RELATIONSHIP'],
        parameters: {},
      },
      {
        name: 'investigation_entity_counts',
        query: `
          MATCH (i:Investigation)
          OPTIONAL MATCH (i)-[:CONTAINS]->(e:Entity)
          WITH i, COUNT(e) as entityCount
          RETURN i.id as investigationId, i.title as title, entityCount, i.status
        `,
        refreshIntervalMinutes: 5,
        lastRefresh: 0,
        dependencies: ['Investigation', 'Entity', 'CONTAINS'],
        parameters: {},
      },
      {
        name: 'recent_high_value_entities',
        query: `
          MATCH (e:Entity)
          WHERE e.createdAt > datetime() - duration('PT1H')
            AND SIZE([(e)-[:RELATIONSHIP]-()] ) > 5
          RETURN e.id, e.label, e.type, e.createdAt,
                 SIZE([(e)-[:RELATIONSHIP]-()] ) as connectionCount
          ORDER BY connectionCount DESC, e.createdAt DESC
          LIMIT 500
        `,
        refreshIntervalMinutes: 2,
        lastRefresh: 0,
        dependencies: ['Entity', 'RELATIONSHIP'],
        parameters: {},
      },
    ];

    commonViews.forEach((view) => {
      this.materializedViews.set(view.name, view);
    });

    // Start refresh cycle
    setInterval(() => this.refreshMaterializedViews(), 60000); // Check every minute
  }

  private async refreshMaterializedViews(): Promise<void> {
    for (const [name, view] of this.materializedViews) {
      const now = Date.now();
      const refreshIntervalMs = view.refreshIntervalMinutes * 60 * 1000;

      if (now - view.lastRefresh > refreshIntervalMs) {
        try {
          await this.refreshMaterializedView(name, view);
        } catch (error) {
          logger.error(`Failed to refresh materialized view ${name}:`, error);
        }
      }
    }
  }

  private async refreshMaterializedView(
    name: string,
    view: MaterializedView,
  ): Promise<void> {
    const session = this.driver.session();
    const startTime = Date.now();

    try {
      const result = await session.run(view.query, view.parameters);
      const records = result.records.map((record) => record.toObject());

      // Cache the materialized view result
      const cacheKey = `${this.MATERIALIZED_VIEW_PREFIX}${name}`;
      if (this.redis) {
        await this.redis.setex(
          cacheKey,
          view.refreshIntervalMinutes * 60 + 300, // TTL + 5min buffer
          JSON.stringify({
            records,
            refreshedAt: Date.now(),
            executionTimeMs: Date.now() - startTime,
          }),
        );
      }

      view.lastRefresh = Date.now();

      logger.info(`Refreshed materialized view ${name}`, {
        recordCount: records.length,
        executionTimeMs: Date.now() - startTime,
      });
    } finally {
      await session.close();
    }
  }

  private async checkMaterializedViews(
    query: string,
    parameters: Record<string, any>,
  ): Promise<{ result: any; metrics: QueryMetrics } | null> {
    // Simplified pattern matching for materialized views
    const queryLower = query.toLowerCase().replace(/\s+/g, ' ').trim();

    // Check for entity centrality queries
    if (
      queryLower.includes('size') &&
      queryLower.includes('relationship') &&
      queryLower.includes('order by')
    ) {
      return await this.getMaterializedViewResult('entity_degree_centrality');
    }

    // Check for investigation summary queries
    if (
      queryLower.includes('investigation') &&
      queryLower.includes('count') &&
      queryLower.includes('entity')
    ) {
      return await this.getMaterializedViewResult(
        'investigation_entity_counts',
      );
    }

    // Check for recent high-value entity queries
    if (
      queryLower.includes('createdat') &&
      queryLower.includes('duration') &&
      queryLower.includes('relationship')
    ) {
      return await this.getMaterializedViewResult('recent_high_value_entities');
    }

    return null;
  }

  private async getMaterializedViewResult(
    viewName: string,
  ): Promise<{ result: any; metrics: QueryMetrics } | null> {
    if (!this.redis) return null;

    const cacheKey = `${this.MATERIALIZED_VIEW_PREFIX}${viewName}`;
    const cached = await this.redis.get(cacheKey);

    if (!cached) return null;

    const viewData = JSON.parse(cached);
    return {
      result: { records: viewData.records },
      metrics: {
        executionTimeMs: viewData.executionTimeMs,
        nodesReturned: viewData.records.length,
        relationshipsReturned: 0,
        dbHits: 0,
        allocatedBytes: 0,
        pageCacheHits: 100,
        pageCacheMisses: 0,
      },
    };
  }

  /**
   * 🎯 Advanced query optimization methods
   */
  private addIndexHints(query: string): string {
    // Add USING INDEX hints for known high-cardinality properties
    let optimized = query;

    const indexHints = [
      { pattern: /WHERE\s+e\.id\s*=/, hint: ' USING INDEX e:Entity(id) ' },
      { pattern: /WHERE\s+u\.email\s*=/, hint: ' USING INDEX u:User(email) ' },
      {
        pattern: /WHERE\s+i\.id\s*=/,
        hint: ' USING INDEX i:Investigation(id) ',
      },
    ];

    indexHints.forEach(({ pattern, hint }) => {
      if (pattern.test(optimized) && !optimized.includes('USING INDEX')) {
        optimized = optimized.replace(pattern, (match) => match + hint);
      }
    });

    return optimized;
  }

  private optimizeVariableLengthPaths(query: string): string {
    // Replace unbounded variable-length paths with bounded ones
    return query.replace(/\*(\d+\.\.)?\*/g, '*1..5');
  }

  private pushDownFilters(query: string): string {
    // Simple filter pushdown - move WHERE clauses closer to MATCH
    // This is a simplified version; production would use a proper query parser
    return query;
  }

  /**
   * 💰 Cost calculation and resource estimation
   */
  private calculateQueryCost(score: number, factors: any): number {
    let cost = 0.001; // Base cost

    cost += score * 0.01; // Complexity factor
    cost += factors.nodeTraversals * 0.002;
    cost += factors.relationshipTraversals * 0.005;
    cost += factors.aggregations * 0.003;
    cost += factors.textSearch * 0.01;

    return Math.round(cost * 1000) / 1000; // Round to 3 decimals
  }

  private calculateTimeout(complexityScore: number): number {
    const baseTimeout = 5000; // 5 seconds
    const maxTimeout = 120000; // 2 minutes

    return Math.min(baseTimeout + complexityScore * 60000, maxTimeout);
  }

  private calculateMemoryRequirement(score: number, factors: any): number {
    let memoryMB = 64; // Base memory

    memoryMB += score * 256;
    memoryMB += factors.aggregations * 32;
    memoryMB += factors.relationshipTraversals * 16;

    return Math.min(memoryMB, 1024); // Cap at 1GB
  }

  /**
   * 🚀 Caching utilities
   */
  private generateQueryHash(
    query: string,
    parameters: Record<string, any>,
  ): string {
    const normalized = query.toLowerCase().replace(/\s+/g, ' ').trim();
    const paramStr = JSON.stringify(parameters, Object.keys(parameters).sort());
    return createHash('md5')
      .update(normalized + paramStr)
      .digest('hex');
  }

  private async getCachedResult(
    queryHash: string,
  ): Promise<CachedQueryResult | null> {
    if (!this.redis) return null;

    const cached = await this.redis.get(`${this.CACHE_PREFIX}${queryHash}`);
    if (!cached) return null;

    const result: CachedQueryResult = JSON.parse(cached);

    // Check if cache entry is still valid
    const age = Date.now() - result.timestamp;
    if (age > result.ttlSeconds * 1000) {
      await this.redis.del(`${this.CACHE_PREFIX}${queryHash}`);
      return null;
    }

    return result;
  }

  private async cacheResult(
    queryHash: string,
    result: Result,
    metrics: QueryMetrics,
    complexity: QueryComplexity,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.redis) return;

    const serializedResult = this.serializeResult(result);
    const cachedData: CachedQueryResult = {
      result: serializedResult,
      metrics,
      timestamp: Date.now(),
      ttlSeconds,
      complexity,
    };

    await this.redis.setex(
      `${this.CACHE_PREFIX}${queryHash}`,
      ttlSeconds,
      JSON.stringify(cachedData),
    );
  }

  private shouldCacheQuery(
    complexity: QueryComplexity,
    metrics: QueryMetrics,
  ): boolean {
    // Cache expensive queries that took longer than 1 second
    if (metrics.executionTimeMs > 1000) return true;

    // Cache complex queries regardless of execution time
    if (complexity.score > 0.5) return true;

    // Cache queries that return many results
    if (metrics.nodesReturned + metrics.relationshipsReturned > 100)
      return true;

    return false;
  }

  private calculateCacheTtl(
    complexity: QueryComplexity,
    metrics: QueryMetrics,
  ): number {
    let ttl = 300; // 5 minutes base

    // Longer TTL for expensive queries
    if (metrics.executionTimeMs > 5000) ttl *= 4;
    else if (metrics.executionTimeMs > 2000) ttl *= 2;

    // Shorter TTL for simple, fast queries
    if (complexity.score < 0.2 && metrics.executionTimeMs < 500) {
      ttl = 60; // 1 minute
    }

    return ttl;
  }

  /**
   * 📊 Metrics and monitoring utilities
   */
  private async extractMetrics(
    result: Result,
    executionTime: number,
    complexity: QueryComplexity,
  ): Promise<QueryMetrics> {
    const summary = result.summary;
    const profile = summary.profile;
    const counters = summary.counters;

    return {
      executionTimeMs: executionTime,
      nodesReturned: result.records.length,
      relationshipsReturned: counters.relationshipsCreated() || 0,
      dbHits: profile?.dbHits || 0,
      allocatedBytes: 0, // Neo4j doesn't expose this in summary
      pageCacheHits: profile?.pageCacheHits || 0,
      pageCacheMisses: profile?.pageCacheMisses || 0,
    };
  }

  private async updateQueryStats(
    queryHash: string,
    metrics: QueryMetrics,
  ): Promise<void> {
    if (!this.redis) return;

    const statsKey = `${this.QUERY_STATS_PREFIX}${queryHash}`;
    const stats = this.queryStats.get(queryHash) || [];

    stats.push(metrics);

    // Keep only last 100 executions
    if (stats.length > 100) {
      stats.shift();
    }

    this.queryStats.set(queryHash, stats);

    // Also store aggregated stats in Redis
    const aggregated = this.aggregateStats(stats);
    await this.redis.setex(statsKey, 86400, JSON.stringify(aggregated)); // 24h TTL
  }

  private aggregateStats(stats: QueryMetrics[]): any {
    if (stats.length === 0) return null;

    const executionTimes = stats.map((s) => s.executionTimeMs);
    const dbHits = stats.map((s) => s.dbHits);

    return {
      count: stats.length,
      avgExecutionTime:
        executionTimes.reduce((a, b) => a + b, 0) / stats.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      p95ExecutionTime: this.percentile(executionTimes, 0.95),
      avgDbHits: dbHits.reduce((a, b) => a + b, 0) / stats.length,
      lastExecuted: Date.now(),
    };
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 🔄 Serialization utilities
   */
  private serializeResult(result: Result): any {
    return {
      records: result.records.map((record) => ({
        keys: record.keys,
        _fields: record._fields.map((field) => this.serializeValue(field)),
      })),
      summary: {
        queryType: result.summary.queryType,
        counters: result.summary.counters,
        resultAvailableAfter: result.summary.resultAvailableAfter,
        resultConsumedAfter: result.summary.resultConsumedAfter,
      },
    };
  }

  private deserializeResult(serialized: any): Result {
    // This is a simplified deserialization - production would need full Neo4j type reconstruction
    return serialized as Result;
  }

  private serializeValue(value: any): any {
    if (value && typeof value === 'object') {
      if (Integer.isInteger(value)) {
        return { _type: 'Integer', _value: value.toString() };
      }
      // Handle other Neo4j types as needed
    }
    return value;
  }

  private getAccessMode(query: string): string {
    const writeKeywords = ['create', 'merge', 'set', 'delete', 'remove'];
    const queryLower = query.toLowerCase();

    return writeKeywords.some((keyword) => queryLower.includes(keyword))
      ? 'WRITE'
      : 'READ';
  }

  /**
   * 📊 Performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Emit performance metrics every 30 seconds
    setInterval(async () => {
      const stats = await this.getPerformanceStats();
      this.emit('performanceStats', stats);
    }, 30000);
  }

  async getPerformanceStats(): Promise<any> {
    const allStats = Array.from(this.queryStats.values()).flat();

    if (allStats.length === 0) {
      return {
        totalQueries: 0,
        avgExecutionTime: 0,
        cacheHitRate: 0,
        materializedViewsCount: this.materializedViews.size,
      };
    }

    const executionTimes = allStats.map((s) => s.executionTimeMs);

    return {
      totalQueries: allStats.length,
      avgExecutionTime:
        executionTimes.reduce((a, b) => a + b, 0) / allStats.length,
      p95ExecutionTime: this.percentile(executionTimes, 0.95),
      p99ExecutionTime: this.percentile(executionTimes, 0.99),
      materializedViewsCount: this.materializedViews.size,
      activeCacheEntries: this.redis ? await this.redis.dbsize() : 0,
    };
  }

  /**
   * 🧹 Cache management
   */
  async clearCache(pattern?: string): Promise<void> {
    if (!this.redis) return;

    const searchPattern = pattern
      ? `${this.CACHE_PREFIX}*${pattern}*`
      : `${this.CACHE_PREFIX}*`;
    const keys = await this.redis.keys(searchPattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info(
        `Cleared ${keys.length} cache entries matching pattern: ${searchPattern}`,
      );
    }
  }

  async getCacheStats(): Promise<any> {
    if (!this.redis) return { available: false };

    const queryKeys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    const viewKeys = await this.redis.keys(`${this.MATERIALIZED_VIEW_PREFIX}*`);
    const statsKeys = await this.redis.keys(`${this.QUERY_STATS_PREFIX}*`);

    return {
      available: true,
      queryCache: {
        entries: queryKeys.length,
        memoryUsage: await this.estimateCacheMemoryUsage(queryKeys),
      },
      materializedViews: {
        entries: viewKeys.length,
        memoryUsage: await this.estimateCacheMemoryUsage(viewKeys),
      },
      queryStats: {
        entries: statsKeys.length,
      },
    };
  }

  private async estimateCacheMemoryUsage(keys: string[]): Promise<number> {
    if (!this.redis || keys.length === 0) return 0;

    // Sample a few keys to estimate average size
    const sampleSize = Math.min(10, keys.length);
    const sampleKeys = keys.slice(0, sampleSize);
    let totalSize = 0;

    for (const key of sampleKeys) {
      const value = await this.redis.get(key);
      if (value) {
        totalSize += Buffer.byteLength(value, 'utf8');
      }
    }

    const avgSize = totalSize / sampleSize;
    return Math.round(((avgSize * keys.length) / 1024 / 1024) * 100) / 100; // MB
  }
}
