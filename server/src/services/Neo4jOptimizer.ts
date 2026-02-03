// @ts-nocheck
/**
 * Neo4j Query Optimizer
 *
 * Provides optimized query templates and performance monitoring
 * for common graph operations.
 */

import type { Driver, Session } from 'neo4j-driver';
import pino from 'pino';

const logger = (pino as any)({ name: 'Neo4jOptimizer' });

interface QueryProfile {
  cypher: string;
  parameters: Record<string, any>;
  executionTime: number;
  dbHits: number;
  operatorType: string;
  usedIndexes: string[];
}

interface PerformanceMetrics {
  averageExecutionTime: number;
  indexUsageRate: number;
  slowQueries: QueryProfile[];
  totalQueries: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  graphikaTargets: {
    p95Target: number;
    p99Target: number;
    meetsTarget: boolean;
  };
}

export class Neo4jOptimizer {
  private driver: Driver;
  private queryProfiles: QueryProfile[] = [];
  private slowQueryThreshold: number = 100; // ms
  private readonly graphikaTargets = { p95: 400, p99: 750 };

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Optimized entity lookup by tenant and type
   */
  getOptimizedEntityQuery(includeEmbedding: boolean = false): string {
    const embeddingClause = includeEmbedding ? ', e.embedding' : '';

    return `
      MATCH (e:Entity {tenantId: $tenantId})
      WHERE e.type = $type
      RETURN e.id, e.type, e.props, e.createdAt, e.updatedAt${embeddingClause}
      ORDER BY e.createdAt DESC
      LIMIT $limit
    `;
  }

  /**
   * Optimized neighborhood traversal with hop limits
   */
  getOptimizedNeighborhoodQuery(maxHops: number = 2): string {
    return `
      MATCH (start:Entity {id: $entityId, tenantId: $tenantId})
      CALL apoc.path.subgraphNodes(start, {
        relationshipFilter: "RELATIONSHIP",
        labelFilter: "Entity",
        minLevel: 1,
        maxLevel: ${maxHops},
        filterStartNode: false
      }) YIELD node
      WHERE node.tenantId = $tenantId
      RETURN DISTINCT node.id, node.type, node.props
      LIMIT $limit
    `;
  }

  /**
   * Optimized relationship traversal with type filtering
   */
  getOptimizedRelationshipQuery(): string {
    return `
      MATCH (a:Entity {tenantId: $tenantId})-[r:RELATIONSHIP {tenantId: $tenantId}]->(b:Entity {tenantId: $tenantId})
      WHERE r.type = $relationshipType
      AND a.id = $fromEntityId
      RETURN r.id, r.type, r.props, r.createdAt, b.id AS targetId, b.type AS targetType
      ORDER BY r.createdAt DESC
      LIMIT $limit
    `;
  }

  /**
   * Optimized semantic search using vector index
   */
  getOptimizedSemanticSearchQuery(): string {
    // TODO: Migrate to Cypher 25 Native Vector search for Neo4j 2025.01+
    // db.index.vector.queryNodes is deprecated. Use native VECTOR type and vector search.
    return `
      CALL db.index.vector.queryNodes('entity_embedding_idx', $topK, $queryEmbedding)
      YIELD node, score
      WHERE node.tenantId = $tenantId
      AND ($entityType IS NULL OR node.type = $entityType)
      RETURN node.id, node.type, node.props, score
      ORDER BY score DESC
    `;
  }

  /**
   * Execute query with performance profiling
   */
  async executeWithProfiling<T>(
    cypher: string,
    parameters: Record<string, any>,
    session: Session,
  ): Promise<{ results: T[]; profile: QueryProfile }> {
    const startTime = Date.now();

    try {
      // Execute with PROFILE for performance analysis
      const profiledCypher = `PROFILE ${cypher}`;
      const result = await session.run(profiledCypher, parameters);

      const executionTime = Date.now() - startTime;
      const profile = this.extractProfile(
        result,
        cypher,
        parameters,
        executionTime,
      );

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          executionTime,
          cypher: cypher.substring(0, 100),
          dbHits: profile.dbHits,
        });
      }

      this.queryProfiles.push(profile);

      // Keep only last 1000 profiles for memory management
      if (this.queryProfiles.length > 1000) {
        this.queryProfiles = this.queryProfiles.slice(-1000);
      }

      return {
        results: result.records.map((record) => record.toObject()) as T[],
        profile,
      };
    } catch (error: any) {
      logger.error({ error, cypher, parameters }, 'Query execution failed');
      throw error;
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  analyzePerformance(): PerformanceMetrics {
    if (this.queryProfiles.length === 0) {
      return {
        averageExecutionTime: 0,
        indexUsageRate: 0,
        slowQueries: [],
        totalQueries: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        graphikaTargets: {
          p95Target: this.graphikaTargets.p95,
          p99Target: this.graphikaTargets.p99,
          meetsTarget: true,
        },
      };
    }

    const totalExecutionTime = this.queryProfiles.reduce(
      (sum, profile) => sum + profile.executionTime,
      0,
    );

    const queriesWithIndexes = this.queryProfiles.filter(
      (profile) => profile.usedIndexes.length > 0,
    );

    const slowQueries = this.queryProfiles.filter(
      (profile) => profile.executionTime > this.slowQueryThreshold,
    );

    const durations = this.queryProfiles.map((p) => p.executionTime);
    const p95ExecutionTime = this.percentile(durations, 0.95);
    const p99ExecutionTime = this.percentile(durations, 0.99);

    return {
      averageExecutionTime: totalExecutionTime / this.queryProfiles.length,
      indexUsageRate: queriesWithIndexes.length / this.queryProfiles.length,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      totalQueries: this.queryProfiles.length,
      p95ExecutionTime,
      p99ExecutionTime,
      graphikaTargets: {
        p95Target: this.graphikaTargets.p95,
        p99Target: this.graphikaTargets.p99,
        meetsTarget:
          p95ExecutionTime <= this.graphikaTargets.p95 &&
          p99ExecutionTime <= this.graphikaTargets.p99,
      },
    };
  }

  /**
   * Create indexes for optimal performance
   */
  async createOptimalIndexes(session: Session): Promise<void> {
    const indexCommands = [
      // Entity indexes
      'CREATE INDEX entity_tenant_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.tenantId, e.type)',
      'CREATE INDEX entity_created_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',

      // Relationship indexes
      'CREATE INDEX rel_tenant_type_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]->() ON (r.tenantId, r.type)',

      // Vector index for embeddings
      // TODO: Migrate to Cypher 25 for Neo4j 2025.01+
      // Use CREATE VECTOR INDEX instead of CREATE INDEX ... OPTIONS.
      `CREATE INDEX entity_embedding_idx IF NOT EXISTS FOR (e:Entity) ON (e.embedding)
       OPTIONS {indexConfig: {
         \`vector.dimensions\`: 1536,
         \`vector.similarity_function\`: 'cosine'
       }}`,
    ];

    for (const command of indexCommands) {
      try {
        await session.run(command);
        logger.info('Created index', { command: command.substring(0, 50) });
      } catch (error: any) {
        logger.warn('Index creation failed or already exists', {
          command: command.substring(0, 50),
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Get query recommendations based on performance analysis
   */
  getQueryRecommendations(): string[] {
    const metrics = this.analyzePerformance();
    const recommendations: string[] = [];

    if (metrics.indexUsageRate < 0.8) {
      recommendations.push(
        'Consider adding more indexes - current index usage rate is low',
      );
    }

    if (metrics.averageExecutionTime > 50) {
      recommendations.push(
        'Average query time is high - review query patterns and indexing',
      );
    }

    if (metrics.slowQueries.length > metrics.totalQueries * 0.1) {
      recommendations.push(
        'High percentage of slow queries - optimize frequently used patterns',
      );
    }

    if (!metrics.graphikaTargets.meetsTarget) {
      recommendations.push(
        `Graphika benchmarks missed (p95 ${metrics.p95ExecutionTime.toFixed(
          1,
        )}ms / p99 ${metrics.p99ExecutionTime.toFixed(
          1,
        )}ms) - tighten traversal depth or expand indexes`,
      );
    }

    return recommendations;
  }

  /**
   * Extract performance profile from query result
   */
  private extractProfile(
    result: { summary: { plan?: unknown; profile?: unknown } },
    cypher: string,
    parameters: Record<string, unknown>,
    executionTime: number,
  ): QueryProfile {
    const summary = result.summary;
    const plan = summary.plan || summary.profile;

    let dbHits = 0;
    let operatorType = 'Unknown';
    let usedIndexes: string[] = [];

    if (plan) {
      // Extract db hits and operator info
      dbHits = this.extractDbHits(plan);
      operatorType = plan.operatorType || 'Unknown';
      usedIndexes = this.extractIndexUsage(plan);
    }

    return {
      cypher,
      parameters,
      executionTime,
      dbHits,
      operatorType,
      usedIndexes,
    };
  }

  private extractDbHits(plan: { dbHits?: number; children?: unknown[] }): number {
    let hits = plan.dbHits || 0;
    if (plan.children) {
      for (const child of plan.children) {
        hits += this.extractDbHits(child as { dbHits?: number; children?: unknown[] });
      }
    }
    return hits;
  }

  private extractIndexUsage(plan: { operatorType?: string; children?: unknown[] }): string[] {
    const indexes: string[] = [];

    if (plan.operatorType && plan.operatorType.includes('Index')) {
      indexes.push(plan.operatorType);
    }

    if (plan.children) {
      for (const child of plan.children) {
        indexes.push(...this.extractIndexUsage(child as { operatorType?: string; children?: unknown[] }));
      }
    }

    return [...new Set(indexes)]; // Remove duplicates
  }

  /**
   * Clear performance history
   */
  clearProfiles(): void {
    this.queryProfiles = [];
    logger.info('Query profiles cleared');
  }

  private percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return sorted[idx];
  }
}

export default Neo4jOptimizer;
