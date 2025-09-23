/**
 * Neo4j Query Optimizer
 *
 * Optimizes Cypher queries for performance to meet SLO targets:
 * - 1-hop queries: p95 ≤300ms
 * - 2-3 hop queries: p95 ≤1,200ms
 *
 * Provides query plan caching, read replica routing, and performance hints.
 */

import { Driver, Session, Result, QueryResult } from 'neo4j-driver';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

interface QueryPlan {
  operatorType: string;
  identifiers: string[];
  arguments: Record<string, any>;
  children: QueryPlan[];
  estimatedRows: number;
  dbHits: number;
  cost: number;
}

interface QueryMetadata {
  hopCount: number;
  complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
  estimatedCost: number;
  useReadReplica: boolean;
  hints: string[];
  timeout: number;
}

interface OptimizedQuery {
  cypher: string;
  parameters: Record<string, any>;
  metadata: QueryMetadata;
  planHash?: string;
}

interface QueryPerformanceMetrics {
  executionTime: number;
  dbHits: number;
  allocatedBytes: number;
  pageCacheMisses: number;
  pageCacheHits: number;
}

export class Neo4jQueryOptimizer {
  private driver: Driver;
  private readDriver?: Driver;
  private planCache: LRUCache<string, QueryPlan>;
  private metadataCache: LRUCache<string, QueryMetadata>;
  private performanceMetrics: Map<string, QueryPerformanceMetrics[]>;

  // Performance thresholds based on SLO requirements
  private static readonly SLO_THRESHOLDS = {
    ONE_HOP_P95_MS: 300,
    TWO_THREE_HOP_P95_MS: 1200,
    MAX_COMPLEXITY_SCORE: 1000,
    MAX_DB_HITS: 100000,
    READ_REPLICA_THRESHOLD: 2 // Use read replica for 2+ hop queries
  };

  // Query patterns and their optimizations
  private static readonly OPTIMIZATION_PATTERNS = {
    // Single entity lookup by ID
    ENTITY_BY_ID: {
      pattern: /MATCH \(n\) WHERE id\(n\) = \$id/,
      hints: ['USING INDEX n:Entity(id)', 'LIMIT 1'],
      useReadReplica: true
    },

    // Relationship traversal patterns
    ONE_HOP_TRAVERSAL: {
      pattern: /MATCH \(a\)-\[r\]->\(b\)/,
      hints: ['USING INDEX a:Entity(id)', 'WITH a, r, b LIMIT 1000'],
      useReadReplica: true
    },

    TWO_HOP_TRAVERSAL: {
      pattern: /MATCH \(a\)-\[r1\]->\(b\)-\[r2\]->\(c\)/,
      hints: ['USING INDEX a:Entity(id)', 'WITH a, b LIMIT 100', 'WITH a, b, c LIMIT 1000'],
      useReadReplica: true
    },

    // Aggregation queries
    COUNT_RELATIONSHIPS: {
      pattern: /COUNT\(\w+\)/,
      hints: ['WITH count(*) as cnt'],
      useReadReplica: true
    },

    // Search queries
    TEXT_SEARCH: {
      pattern: /WHERE .* CONTAINS \$searchTerm/,
      hints: ['USING TEXT INDEX'],
      useReadReplica: true
    }
  };

  constructor(driver: Driver, readDriver?: Driver) {
    this.driver = driver;
    this.readDriver = readDriver;

    this.planCache = new LRUCache({
      max: 1000,
      ttl: 3600000 // 1 hour
    });

    this.metadataCache = new LRUCache({
      max: 5000,
      ttl: 1800000 // 30 minutes
    });

    this.performanceMetrics = new Map();
  }

  /**
   * Optimize a Cypher query for performance
   */
  async optimizeQuery(
    cypher: string,
    parameters: Record<string, any> = {},
    context: {
      tenantId: string;
      userId?: string;
      readonly?: boolean;
      timeout?: number;
    }
  ): Promise<OptimizedQuery> {
    try {
      const normalizedCypher = this.normalizeCypher(cypher);
      const queryHash = this.generateQueryHash(normalizedCypher, parameters);

      // Check cache for existing metadata
      let metadata = this.metadataCache.get(queryHash);

      if (!metadata) {
        // Analyze query structure
        metadata = await this.analyzeQuery(normalizedCypher);
        this.metadataCache.set(queryHash, metadata);
      }

      // Apply optimizations
      const optimizedCypher = this.applyOptimizations(normalizedCypher, metadata);

      // Determine execution strategy
      const useReadReplica = context.readonly !== false &&
                           (metadata.useReadReplica || context.readonly === true);

      const optimizedQuery: OptimizedQuery = {
        cypher: optimizedCypher,
        parameters,
        metadata: {
          ...metadata,
          useReadReplica,
          timeout: context.timeout || this.calculateTimeout(metadata)
        },
        planHash: queryHash
      };

      logger.debug(`Optimized query for ${metadata.hopCount}-hop traversal`, {
        complexity: metadata.complexity,
        useReadReplica,
        hints: metadata.hints.length
      });

      return optimizedQuery;

    } catch (error) {
      logger.error('Query optimization failed:', error);

      // Return unoptimized query as fallback
      return {
        cypher,
        parameters,
        metadata: {
          hopCount: 1,
          complexity: 'simple',
          estimatedCost: 100,
          useReadReplica: false,
          hints: [],
          timeout: 30000
        }
      };
    }
  }

  /**
   * Execute optimized query with performance monitoring
   */
  async executeOptimizedQuery(optimizedQuery: OptimizedQuery): Promise<QueryResult> {
    const startTime = Date.now();
    const driver = optimizedQuery.metadata.useReadReplica && this.readDriver
      ? this.readDriver
      : this.driver;

    const session = driver.session({
      database: 'neo4j',
      defaultAccessMode: optimizedQuery.metadata.useReadReplica ? 'READ' : 'WRITE'
    });

    try {
      // Set query timeout
      const result = await session.run(
        optimizedQuery.cypher,
        optimizedQuery.parameters,
        {
          timeout: optimizedQuery.metadata.timeout
        }
      );

      const executionTime = Date.now() - startTime;

      // Extract performance metrics from result summary
      const summary = result.summary;
      const metrics: QueryPerformanceMetrics = {
        executionTime,
        dbHits: summary.profile?.dbHits || 0,
        allocatedBytes: summary.profile?.allocatedBytes || 0,
        pageCacheMisses: summary.profile?.pageCacheMisses || 0,
        pageCacheHits: summary.profile?.pageCacheHits || 0
      };

      // Store performance metrics for analysis
      this.recordPerformanceMetrics(optimizedQuery.planHash!, metrics);

      // Check if performance meets SLO thresholds
      this.validatePerformance(optimizedQuery.metadata, metrics);

      logger.debug(`Query executed in ${executionTime}ms`, {
        hopCount: optimizedQuery.metadata.hopCount,
        dbHits: metrics.dbHits,
        useReadReplica: optimizedQuery.metadata.useReadReplica
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Query execution failed after ${executionTime}ms:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Analyze query structure to determine complexity and optimization strategy
   */
  private async analyzeQuery(cypher: string): Promise<QueryMetadata> {
    // Count relationship hops
    const hopCount = this.countRelationshipHops(cypher);

    // Determine complexity based on patterns
    const complexity = this.determineComplexity(cypher, hopCount);

    // Estimate query cost
    const estimatedCost = this.estimateQueryCost(cypher, hopCount);

    // Determine if read replica can be used
    const useReadReplica = this.canUseReadReplica(cypher);

    // Generate optimization hints
    const hints = this.generateOptimizationHints(cypher, hopCount);

    return {
      hopCount,
      complexity,
      estimatedCost,
      useReadReplica,
      hints,
      timeout: this.calculateTimeout({ hopCount, complexity, estimatedCost } as QueryMetadata)
    };
  }

  /**
   * Count relationship hops in a Cypher query
   */
  private countRelationshipHops(cypher: string): number {
    // Match relationship patterns: -[r]-> or -[r*1..3]->
    const relationshipPattern = /-\[[^\]]*\]->/g;
    const relationships = cypher.match(relationshipPattern) || [];

    // Check for variable length paths
    const variableLengthPattern = /-\[[^\]]*\*(\d+)\.\.(\d+)\]->/g;
    let maxHops = relationships.length;

    let match;
    while ((match = variableLengthPattern.exec(cypher)) !== null) {
      const maxLength = parseInt(match[2]);
      maxHops = Math.max(maxHops, maxLength);
    }

    return Math.max(1, maxHops);
  }

  /**
   * Determine query complexity based on patterns and structure
   */
  private determineComplexity(cypher: string, hopCount: number): QueryMetadata['complexity'] {
    const lowerCypher = cypher.toLowerCase();

    // Very complex queries
    if (hopCount > 3 ||
        lowerCypher.includes('collect(') ||
        lowerCypher.includes('unwind') ||
        (lowerCypher.match(/with/g) || []).length > 2) {
      return 'very_complex';
    }

    // Complex queries
    if (hopCount === 3 ||
        lowerCypher.includes('optional match') ||
        lowerCypher.includes('union') ||
        lowerCypher.includes('order by')) {
      return 'complex';
    }

    // Medium complexity
    if (hopCount === 2 ||
        lowerCypher.includes('where') ||
        lowerCypher.includes('count(') ||
        lowerCypher.includes('group by')) {
      return 'medium';
    }

    // Simple queries
    return 'simple';
  }

  /**
   * Estimate query execution cost
   */
  private estimateQueryCost(cypher: string, hopCount: number): number {
    let baseCost = 10;

    // Cost increases exponentially with hops
    baseCost *= Math.pow(10, hopCount - 1);

    // Additional cost factors
    const lowerCypher = cypher.toLowerCase();

    if (lowerCypher.includes('collect(')) baseCost *= 5;
    if (lowerCypher.includes('unwind')) baseCost *= 3;
    if (lowerCypher.includes('optional match')) baseCost *= 2;
    if (lowerCypher.includes('order by')) baseCost *= 1.5;

    // Text search is expensive
    if (lowerCypher.includes('contains') || lowerCypher.includes('=~')) {
      baseCost *= 10;
    }

    return Math.min(baseCost, Neo4jQueryOptimizer.SLO_THRESHOLDS.MAX_COMPLEXITY_SCORE);
  }

  /**
   * Determine if query can use read replica
   */
  private canUseReadReplica(cypher: string): boolean {
    const lowerCypher = cypher.toLowerCase();

    // Mutations must use primary
    const mutations = ['create', 'set', 'delete', 'remove', 'merge'];
    if (mutations.some(mutation => lowerCypher.includes(mutation))) {
      return false;
    }

    return true;
  }

  /**
   * Generate optimization hints for query
   */
  private generateOptimizationHints(cypher: string, hopCount: number): string[] {
    const hints: string[] = [];

    // Add index hints for entity lookups
    if (cypher.includes('WHERE id(')) {
      hints.push('USING INDEX');
    }

    // Add LIMIT hints for multi-hop queries
    if (hopCount >= 2) {
      hints.push('LIMIT intermediate results');
    }

    // Add profiling for complex queries
    if (hopCount >= 3) {
      hints.push('PROFILE');
    }

    // Check for specific patterns and add appropriate hints
    for (const [patternName, pattern] of Object.entries(Neo4jQueryOptimizer.OPTIMIZATION_PATTERNS)) {
      if (pattern.pattern.test(cypher)) {
        hints.push(...pattern.hints);
        break;
      }
    }

    return hints;
  }

  /**
   * Apply optimization hints and transformations to query
   */
  private applyOptimizations(cypher: string, metadata: QueryMetadata): string {
    let optimizedCypher = cypher;

    // Add query profiling for performance monitoring
    if (metadata.complexity !== 'simple') {
      optimizedCypher = `PROFILE ${optimizedCypher}`;
    }

    // Add appropriate LIMIT clauses for complex queries
    if (metadata.hopCount >= 2 && !cypher.toLowerCase().includes('limit')) {
      // Add LIMIT to prevent runaway queries
      const limit = metadata.hopCount === 2 ? 1000 : 500;
      optimizedCypher += ` LIMIT ${limit}`;
    }

    // Add index hints for known patterns
    if (cypher.includes('WHERE id(') && !cypher.includes('USING INDEX')) {
      optimizedCypher = optimizedCypher.replace(
        /MATCH \((\w+)\)/,
        'MATCH ($1) USING INDEX $1:Entity(id)'
      );
    }

    return optimizedCypher;
  }

  /**
   * Calculate appropriate timeout based on query metadata
   */
  private calculateTimeout(metadata: QueryMetadata): number {
    let baseTimeout = 5000; // 5 seconds

    switch (metadata.complexity) {
      case 'simple':
        baseTimeout = 2000;
        break;
      case 'medium':
        baseTimeout = 5000;
        break;
      case 'complex':
        baseTimeout = 10000;
        break;
      case 'very_complex':
        baseTimeout = 20000;
        break;
    }

    // Adjust based on hop count
    baseTimeout *= metadata.hopCount;

    // Cap at 30 seconds
    return Math.min(baseTimeout, 30000);
  }

  /**
   * Record performance metrics for analysis
   */
  private recordPerformanceMetrics(planHash: string, metrics: QueryPerformanceMetrics): void {
    if (!this.performanceMetrics.has(planHash)) {
      this.performanceMetrics.set(planHash, []);
    }

    const metricsList = this.performanceMetrics.get(planHash)!;
    metricsList.push(metrics);

    // Keep only last 100 executions per query
    if (metricsList.length > 100) {
      metricsList.shift();
    }
  }

  /**
   * Validate that performance meets SLO thresholds
   */
  private validatePerformance(metadata: QueryMetadata, metrics: QueryPerformanceMetrics): void {
    const { hopCount } = metadata;
    const { executionTime, dbHits } = metrics;

    let threshold: number;
    if (hopCount === 1) {
      threshold = Neo4jQueryOptimizer.SLO_THRESHOLDS.ONE_HOP_P95_MS;
    } else {
      threshold = Neo4jQueryOptimizer.SLO_THRESHOLDS.TWO_THREE_HOP_P95_MS;
    }

    if (executionTime > threshold) {
      logger.warn(`Query execution time (${executionTime}ms) exceeds SLO threshold (${threshold}ms)`, {
        hopCount,
        complexity: metadata.complexity,
        dbHits
      });
    }

    if (dbHits > Neo4jQueryOptimizer.SLO_THRESHOLDS.MAX_DB_HITS) {
      logger.warn(`Query db hits (${dbHits}) exceeds threshold`, {
        hopCount,
        complexity: metadata.complexity
      });
    }
  }

  /**
   * Get performance statistics for a query plan
   */
  getPerformanceStats(planHash: string): {
    executionCount: number;
    avgExecutionTime: number;
    p95ExecutionTime: number;
    avgDbHits: number;
  } | null {
    const metrics = this.performanceMetrics.get(planHash);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const executionTimes = metrics.map(m => m.executionTime).sort((a, b) => a - b);
    const dbHits = metrics.map(m => m.dbHits);

    const p95Index = Math.floor(executionTimes.length * 0.95);

    return {
      executionCount: metrics.length,
      avgExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      p95ExecutionTime: executionTimes[p95Index] || executionTimes[executionTimes.length - 1],
      avgDbHits: dbHits.reduce((sum, hits) => sum + hits, 0) / dbHits.length
    };
  }

  /**
   * Generate normalized query hash for caching
   */
  private generateQueryHash(cypher: string, parameters: Record<string, any>): string {
    const normalized = this.normalizeCypher(cypher);
    const paramString = JSON.stringify(parameters);
    return createHash('sha256').update(normalized + paramString).digest('hex');
  }

  /**
   * Normalize Cypher query for consistent hashing
   */
  private normalizeCypher(cypher: string): string {
    return cypher
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      planCache: {
        size: this.planCache.size,
        max: this.planCache.max
      },
      metadataCache: {
        size: this.metadataCache.size,
        max: this.metadataCache.max
      },
      trackedQueries: this.performanceMetrics.size
    };
  }
}

export default Neo4jQueryOptimizer;