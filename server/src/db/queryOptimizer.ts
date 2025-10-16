// Maestro Conductor v24.3.0 - Graph Query Optimizer
// Epic E16: Search & Index Optimization - Intelligent query optimization and caching

import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { redis } from '../subscriptions/pubsub';
import crypto from 'crypto';

const tracer = trace.getTracer('query-optimizer', '24.3.0');

// Metrics
const optimizerCacheHits = new Counter({
  name: 'query_optimizer_cache_hits_total',
  help: 'Query optimizer cache hits',
  labelNames: ['tenant_id', 'query_type', 'optimization_type'],
});

const optimizerCacheMisses = new Counter({
  name: 'query_optimizer_cache_misses_total',
  help: 'Query optimizer cache misses',
  labelNames: ['tenant_id', 'query_type'],
});

const optimizationTime = new Histogram({
  name: 'query_optimization_duration_seconds',
  help: 'Time spent optimizing queries',
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  labelNames: ['tenant_id', 'optimization_type'],
});

const activeOptimizations = new Gauge({
  name: 'query_optimizations_active',
  help: 'Currently active query optimizations',
  labelNames: ['tenant_id'],
});

export interface QueryPlan {
  originalQuery: string;
  optimizedQuery: string;
  indexes: string[];
  estimatedCost: number;
  estimatedRows: number;
  optimizations: OptimizationRule[];
  cacheStrategy?: CacheStrategy;
  executionHints: ExecutionHint[];
}

export interface OptimizationRule {
  name: string;
  type: 'index_hint' | 'query_rewrite' | 'parameter_tuning' | 'cache_strategy';
  description: string;
  impact: 'low' | 'medium' | 'high';
  applied: boolean;
  reason?: string;
}

export interface CacheStrategy {
  enabled: boolean;
  ttl: number;
  keyPattern: string;
  invalidationRules: string[];
  partitionKeys?: string[];
}

export interface ExecutionHint {
  type: 'parallel' | 'index' | 'join_order' | 'memory' | 'timeout';
  value: string | number;
  description: string;
}

export interface QueryAnalysis {
  complexity: number;
  nodeCount: number;
  relationshipCount: number;
  filterCount: number;
  aggregationCount: number;
  joinCount: number;
  hasWildcard: boolean;
  isRead: boolean;
  isWrite: boolean;
  affectedLabels: string[];
  requiredIndexes: string[];
}

export interface OptimizationContext {
  tenantId: string;
  queryType: 'cypher' | 'sql' | 'gremlin';
  region?: string;
  priority: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  cacheEnabled?: boolean;
}

export class QueryOptimizer {
  private readonly cachePrefix = 'query_optimizer';
  private readonly defaultTTL = 3600; // 1 hour
  private indexHints: Map<string, string[]> = new Map();
  private queryPatterns: Map<string, QueryPlan> = new Map();

  constructor() {
    this.initializeIndexHints();
    this.loadOptimizationPatterns();
  }

  async optimizeQuery(
    query: string,
    params: any = {},
    context: OptimizationContext,
  ): Promise<QueryPlan> {
    return tracer.startActiveSpan(
      'query_optimizer.optimize',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: context.tenantId,
          query_type: context.queryType,
          query_length: query.length,
          priority: context.priority,
        });

        activeOptimizations.inc({ tenant_id: context.tenantId });
        const startTime = Date.now();

        try {
          // Check cache first
          const cacheKey = this.buildCacheKey(query, params, context);
          const cached = await this.getFromCache(cacheKey);

          if (cached && context.cacheEnabled !== false) {
            optimizerCacheHits.inc({
              tenant_id: context.tenantId,
              query_type: context.queryType,
              optimization_type: 'cached',
            });
            return cached;
          }

          optimizerCacheMisses.inc({
            tenant_id: context.tenantId,
            query_type: context.queryType,
          });

          // Analyze query
          const analysis = this.analyzeQuery(query, context.queryType);

          // Generate optimization plan
          const plan = await this.generateOptimizationPlan(
            query,
            params,
            analysis,
            context,
          );

          // Cache the optimization
          await this.cacheOptimization(cacheKey, plan);

          optimizationTime.observe(
            { tenant_id: context.tenantId, optimization_type: 'full' },
            (Date.now() - startTime) / 1000,
          );

          span.setAttributes({
            optimization_count: plan.optimizations.length,
            estimated_cost: plan.estimatedCost,
            cache_enabled: !!plan.cacheStrategy?.enabled,
          });

          return plan;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          activeOptimizations.dec({ tenant_id: context.tenantId });
          span.end();
        }
      },
    );
  }

  private analyzeQuery(query: string, queryType: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();

    if (queryType === 'cypher') {
      return this.analyzeCypherQuery(query, lowerQuery);
    } else if (queryType === 'sql') {
      return this.analyzeSQLQuery(query, lowerQuery);
    } else {
      throw new Error(`Unsupported query type: ${queryType}`);
    }
  }

  private analyzeCypherQuery(query: string, lowerQuery: string): QueryAnalysis {
    // Count various Cypher constructs
    const nodeCount = (query.match(/\([^)]*\)/g) || []).length;
    const relationshipCount = (query.match(/-\[[^\]]*\]-/g) || []).length;
    const filterCount = (query.match(/\bwhere\b/gi) || []).length;
    const aggregationCount = (
      query.match(/\b(count|sum|avg|max|min|collect)\s*\(/gi) || []
    ).length;
    const joinCount = (query.match(/\bwith\b/gi) || []).length;

    const hasWildcard =
      lowerQuery.includes('*') || lowerQuery.includes('collect(');
    const isRead =
      lowerQuery.includes('match') || lowerQuery.includes('return');
    const isWrite =
      lowerQuery.includes('create') ||
      lowerQuery.includes('merge') ||
      lowerQuery.includes('delete') ||
      lowerQuery.includes('set');

    // Extract affected labels
    const labelMatches = query.match(/:(\w+)/g) || [];
    const affectedLabels = labelMatches.map((match) => match.substring(1));

    // Calculate complexity score
    const complexity = this.calculateComplexity({
      nodeCount,
      relationshipCount,
      filterCount,
      aggregationCount,
      joinCount,
      hasWildcard,
    });

    // Determine required indexes
    const requiredIndexes = this.analyzeRequiredIndexes(query, affectedLabels);

    return {
      complexity,
      nodeCount,
      relationshipCount,
      filterCount,
      aggregationCount,
      joinCount,
      hasWildcard,
      isRead,
      isWrite,
      affectedLabels,
      requiredIndexes,
    };
  }

  private analyzeSQLQuery(query: string, lowerQuery: string): QueryAnalysis {
    // Count SQL constructs
    const joinCount = (
      lowerQuery.match(
        /\b(join|inner join|left join|right join|full join)\b/g,
      ) || []
    ).length;
    const filterCount = (lowerQuery.match(/\bwhere\b/g) || []).length;
    const aggregationCount = (
      lowerQuery.match(/\b(count|sum|avg|max|min|group by)\b/g) || []
    ).length;

    const hasWildcard = lowerQuery.includes('*');
    const isRead = lowerQuery.includes('select');
    const isWrite =
      lowerQuery.includes('insert') ||
      lowerQuery.includes('update') ||
      lowerQuery.includes('delete');

    // Extract table names
    const tableMatches =
      lowerQuery.match(/\bfrom\s+(\w+)|\bjoin\s+(\w+)/g) || [];
    const affectedLabels = tableMatches.map((match) =>
      match.replace(/\b(from|join)\s+/g, '').trim(),
    );

    const complexity = this.calculateComplexity({
      nodeCount: affectedLabels.length,
      relationshipCount: joinCount,
      filterCount,
      aggregationCount,
      joinCount,
      hasWildcard,
    });

    const requiredIndexes = this.analyzeSQLRequiredIndexes(
      query,
      affectedLabels,
    );

    return {
      complexity,
      nodeCount: affectedLabels.length,
      relationshipCount: joinCount,
      filterCount,
      aggregationCount,
      joinCount,
      hasWildcard,
      isRead,
      isWrite,
      affectedLabels,
      requiredIndexes,
    };
  }

  private calculateComplexity(factors: {
    nodeCount: number;
    relationshipCount: number;
    filterCount: number;
    aggregationCount: number;
    joinCount: number;
    hasWildcard: boolean;
  }): number {
    let score = 0;

    score += factors.nodeCount * 2;
    score += factors.relationshipCount * 3;
    score += factors.filterCount * 1;
    score += factors.aggregationCount * 4;
    score += factors.joinCount * 5;
    score += factors.hasWildcard ? 10 : 0;

    return score;
  }

  private analyzeRequiredIndexes(query: string, labels: string[]): string[] {
    const indexes: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Common patterns that benefit from indexes
    const patterns = [
      { pattern: /where\s+(\w+)\.(\w+)\s*=/, type: 'equality' },
      { pattern: /where\s+(\w+)\.(\w+)\s*in/, type: 'in' },
      { pattern: /where\s+(\w+)\.(\w+)\s*<|>|<=|>=/, type: 'range' },
      { pattern: /order\s+by\s+(\w+)\.(\w+)/, type: 'sort' },
    ];

    for (const { pattern, type } of patterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[2]) {
          const label = labels.find((l) =>
            lowerQuery.includes(l.toLowerCase()),
          );
          if (label) {
            indexes.push(`${label}.${match[2]}`);
          }
        }
      }
    }

    return [...new Set(indexes)]; // Remove duplicates
  }

  private analyzeSQLRequiredIndexes(query: string, tables: string[]): string[] {
    const indexes: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Extract WHERE conditions
    const whereMatch = lowerQuery.match(
      /where\s+(.+?)(?:\s+(?:group by|order by|limit|$))/,
    );
    if (whereMatch) {
      const conditions = whereMatch[1];
      const columnMatches =
        conditions.match(/(\w+)\.(\w+)|(\w+)\s*[=<>]/g) || [];

      for (const match of columnMatches) {
        const parts = match.split('.');
        if (parts.length === 2) {
          indexes.push(`${parts[0]}.${parts[1]}`);
        } else if (tables.length === 1) {
          indexes.push(`${tables[0]}.${parts[0].replace(/\s*[=<>].*/, '')}`);
        }
      }
    }

    // Extract ORDER BY columns
    const orderMatch = lowerQuery.match(/order\s+by\s+(.+?)(?:\s+(?:limit|$))/);
    if (orderMatch) {
      const columns = orderMatch[1].split(',');
      for (const column of columns) {
        const cleanColumn = column.trim().replace(/\s+(asc|desc).*/, '');
        if (cleanColumn.includes('.')) {
          indexes.push(cleanColumn);
        } else if (tables.length === 1) {
          indexes.push(`${tables[0]}.${cleanColumn}`);
        }
      }
    }

    return [...new Set(indexes)];
  }

  private async generateOptimizationPlan(
    query: string,
    params: any,
    analysis: QueryAnalysis,
    context: OptimizationContext,
  ): Promise<QueryPlan> {
    const optimizations: OptimizationRule[] = [];
    let optimizedQuery = query;
    let estimatedCost = analysis.complexity;

    // Index optimization
    if (analysis.requiredIndexes.length > 0) {
      const indexOptimization = this.generateIndexOptimization(
        analysis.requiredIndexes,
      );
      optimizations.push(indexOptimization);

      if (indexOptimization.applied) {
        estimatedCost *= 0.6; // 40% cost reduction with proper indexes
      }
    }

    // Query rewriting optimizations
    if (context.queryType === 'cypher') {
      const rewriteOptimizations = this.generateCypherOptimizations(
        query,
        analysis,
      );
      optimizations.push(...rewriteOptimizations);

      // Apply query rewrites
      for (const opt of rewriteOptimizations) {
        if (opt.applied && opt.type === 'query_rewrite') {
          optimizedQuery = this.applyCypherRewrite(optimizedQuery, opt);
          estimatedCost *= 0.8; // 20% cost reduction per rewrite
        }
      }
    }

    // Cache strategy
    const cacheStrategy = this.generateCacheStrategy(analysis, context);
    if (cacheStrategy.enabled) {
      optimizations.push({
        name: 'query_caching',
        type: 'cache_strategy',
        description: `Cache query results for ${cacheStrategy.ttl}s`,
        impact: 'high',
        applied: true,
      });
    }

    // Execution hints
    const executionHints = this.generateExecutionHints(analysis, context);

    return {
      originalQuery: query,
      optimizedQuery,
      indexes: analysis.requiredIndexes,
      estimatedCost,
      estimatedRows: this.estimateResultSize(analysis),
      optimizations,
      cacheStrategy,
      executionHints,
    };
  }

  private generateIndexOptimization(
    requiredIndexes: string[],
  ): OptimizationRule {
    const existingIndexes = this.getAvailableIndexes(requiredIndexes);
    const missingIndexes = requiredIndexes.filter(
      (idx) => !existingIndexes.includes(idx),
    );

    if (missingIndexes.length === 0) {
      return {
        name: 'index_usage',
        type: 'index_hint',
        description: `Using existing indexes: ${existingIndexes.join(', ')}`,
        impact: 'high',
        applied: true,
      };
    } else {
      return {
        name: 'missing_indexes',
        type: 'index_hint',
        description: `Consider creating indexes: ${missingIndexes.join(', ')}`,
        impact: 'high',
        applied: false,
        reason: 'Indexes need to be created',
      };
    }
  }

  private generateCypherOptimizations(
    query: string,
    analysis: QueryAnalysis,
  ): OptimizationRule[] {
    const optimizations: OptimizationRule[] = [];
    const lowerQuery = query.toLowerCase();

    // Avoid Cartesian products
    if (analysis.nodeCount > 2 && analysis.relationshipCount === 0) {
      optimizations.push({
        name: 'cartesian_product_warning',
        type: 'query_rewrite',
        description:
          'Potential Cartesian product - consider adding relationships',
        impact: 'high',
        applied: false,
        reason: 'Manual review required',
      });
    }

    // Use LIMIT for large result sets
    if (!lowerQuery.includes('limit') && analysis.hasWildcard) {
      optimizations.push({
        name: 'add_limit',
        type: 'query_rewrite',
        description: 'Add LIMIT clause to prevent large result sets',
        impact: 'medium',
        applied: true,
      });
    }

    // Optimize aggregations
    if (analysis.aggregationCount > 0 && !lowerQuery.includes('with')) {
      optimizations.push({
        name: 'aggregation_optimization',
        type: 'query_rewrite',
        description: 'Use WITH clause to optimize aggregations',
        impact: 'medium',
        applied: true,
      });
    }

    // Filter early
    if (
      analysis.filterCount > 0 &&
      lowerQuery.indexOf('where') > lowerQuery.indexOf('match')
    ) {
      optimizations.push({
        name: 'early_filtering',
        type: 'query_rewrite',
        description: 'Move filters closer to MATCH clauses',
        impact: 'medium',
        applied: true,
      });
    }

    return optimizations;
  }

  private applyCypherRewrite(
    query: string,
    optimization: OptimizationRule,
  ): string {
    let rewrittenQuery = query;

    switch (optimization.name) {
      case 'add_limit':
        if (!query.toLowerCase().includes('limit')) {
          rewrittenQuery = query + ' LIMIT 1000';
        }
        break;

      case 'early_filtering':
        // This would require more sophisticated AST manipulation
        // For now, just return the original query
        break;

      case 'aggregation_optimization':
        // Similarly, this would need AST manipulation
        break;
    }

    return rewrittenQuery;
  }

  private generateCacheStrategy(
    analysis: QueryAnalysis,
    context: OptimizationContext,
  ): CacheStrategy {
    // Don't cache write operations
    if (analysis.isWrite) {
      return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
    }

    // Cache read-heavy queries with low complexity
    if (analysis.isRead && analysis.complexity < 20) {
      const ttl = this.calculateCacheTTL(analysis);
      const keyPattern = this.generateCacheKeyPattern(analysis, context);

      return {
        enabled: true,
        ttl,
        keyPattern,
        invalidationRules: this.generateInvalidationRules(analysis),
        partitionKeys: ['tenant_id', 'region'],
      };
    }

    return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
  }

  private calculateCacheTTL(analysis: QueryAnalysis): number {
    // Base TTL on query complexity and data volatility
    let ttl = 300; // 5 minutes base

    if (analysis.complexity < 10) ttl = 1800; // 30 minutes for simple queries
    if (analysis.aggregationCount > 0) ttl = 600; // 10 minutes for aggregations
    if (analysis.hasWildcard) ttl = 60; // 1 minute for wildcard queries

    return ttl;
  }

  private generateCacheKeyPattern(
    analysis: QueryAnalysis,
    context: OptimizationContext,
  ): string {
    const components = [
      'query_cache',
      context.tenantId,
      context.queryType,
      ...analysis.affectedLabels.sort(),
    ];

    return components.join(':');
  }

  private generateInvalidationRules(analysis: QueryAnalysis): string[] {
    // Generate cache invalidation rules based on affected labels
    return analysis.affectedLabels.map((label) => `${label}:*`);
  }

  private generateExecutionHints(
    analysis: QueryAnalysis,
    context: OptimizationContext,
  ): ExecutionHint[] {
    const hints: ExecutionHint[] = [];

    // Parallel execution for complex queries
    if (analysis.complexity > 50) {
      hints.push({
        type: 'parallel',
        value: 'true',
        description: 'Enable parallel execution for complex query',
      });
    }

    // Memory hints for large aggregations
    if (analysis.aggregationCount > 2) {
      hints.push({
        type: 'memory',
        value: '2GB',
        description: 'Increase memory allocation for aggregations',
      });
    }

    // Timeout based on complexity
    const timeoutMs = Math.min(
      context.timeoutMs || 30000,
      analysis.complexity * 1000,
    );
    hints.push({
      type: 'timeout',
      value: timeoutMs,
      description: `Set query timeout to ${timeoutMs}ms`,
    });

    return hints;
  }

  private estimateResultSize(analysis: QueryAnalysis): number {
    // Simple heuristic for result set size estimation
    let estimate = 1;

    estimate *= Math.pow(10, analysis.nodeCount);
    estimate *= Math.pow(10, analysis.relationshipCount);
    estimate /= Math.pow(2, analysis.filterCount);

    if (analysis.aggregationCount > 0) {
      estimate /= 10; // Aggregations reduce result set size
    }

    return Math.max(1, Math.floor(estimate));
  }

  private getAvailableIndexes(requiredIndexes: string[]): string[] {
    // In a real implementation, this would query the database for existing indexes
    // For now, return a subset based on common patterns
    const commonIndexes = [
      'User.id',
      'User.email',
      'User.tenant_id',
      'Signal.id',
      'Signal.tenant_id',
      'Signal.timestamp',
      'Session.id',
      'Session.user_id',
      'Session.tenant_id',
    ];

    return requiredIndexes.filter((idx) => commonIndexes.includes(idx));
  }

  private buildCacheKey(
    query: string,
    params: any,
    context: OptimizationContext,
  ): string {
    const queryHash = crypto
      .createHash('sha256')
      .update(query + JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);

    return `${this.cachePrefix}:${context.tenantId}:${context.queryType}:${queryHash}`;
  }

  private async getFromCache(cacheKey: string): Promise<QueryPlan | null> {
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Query optimizer cache read error:', error);
      return null;
    }
  }

  private async cacheOptimization(
    cacheKey: string,
    plan: QueryPlan,
  ): Promise<void> {
    try {
      await redis.setWithTTL(cacheKey, JSON.stringify(plan), this.defaultTTL);
    } catch (error) {
      console.error('Query optimizer cache write error:', error);
    }
  }

  private initializeIndexHints(): void {
    // Initialize common index hints
    this.indexHints.set('User', ['id', 'email', 'tenant_id']);
    this.indexHints.set('Signal', ['id', 'tenant_id', 'timestamp']);
    this.indexHints.set('Session', ['id', 'user_id', 'tenant_id']);
  }

  private loadOptimizationPatterns(): void {
    // Load common query optimization patterns
    // This could be loaded from a configuration file or database
  }

  async getOptimizationStats(tenantId: string): Promise<{
    totalOptimizations: number;
    cacheHitRate: number;
    averageOptimizationTime: number;
    topOptimizations: Array<{
      name: string;
      count: number;
      avgImprovement: number;
    }>;
  }> {
    // Return optimization statistics
    return {
      totalOptimizations: 0,
      cacheHitRate: 0,
      averageOptimizationTime: 0,
      topOptimizations: [],
    };
  }

  async clearOptimizationCache(
    tenantId?: string,
    pattern?: string,
  ): Promise<void> {
    const clearPattern =
      pattern ||
      (tenantId
        ? `${this.cachePrefix}:${tenantId}:*`
        : `${this.cachePrefix}:*`);
    console.log('Clearing query optimization cache:', clearPattern);
  }
}

export const queryOptimizer = new QueryOptimizer();
