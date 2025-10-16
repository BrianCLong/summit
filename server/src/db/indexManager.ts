// Maestro Conductor v24.3.0 - Database Index Manager
// Epic E16: Search & Index Optimization - Automated index management and monitoring

import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { neo } from './neo4j';
import { pool } from './pg';

const tracer = trace.getTracer('index-manager', '24.3.0');

// Metrics
const indexOperations = new Counter({
  name: 'index_operations_total',
  help: 'Total index operations',
  labelNames: ['tenant_id', 'database_type', 'operation', 'result'],
});

const indexCreationTime = new Histogram({
  name: 'index_creation_duration_seconds',
  help: 'Time to create database indexes',
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  labelNames: ['database_type', 'index_type'],
});

const indexUsageStats = new Gauge({
  name: 'index_usage_stats',
  help: 'Index usage statistics',
  labelNames: ['tenant_id', 'database_type', 'index_name', 'metric'],
});

const indexSizeBytes = new Gauge({
  name: 'index_size_bytes',
  help: 'Index size in bytes',
  labelNames: ['tenant_id', 'database_type', 'index_name'],
});

export interface IndexDefinition {
  name: string;
  database: 'postgresql' | 'neo4j';
  type:
    | 'btree'
    | 'hash'
    | 'gin'
    | 'gist'
    | 'composite'
    | 'fulltext'
    | 'node_label'
    | 'relationship';
  table?: string; // PostgreSQL table
  label?: string; // Neo4j label
  columns?: string[]; // PostgreSQL columns
  properties?: string[]; // Neo4j properties
  unique?: boolean;
  partial?: boolean;
  condition?: string; // Partial index condition
  tenantScoped?: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedSize?: number;
  estimatedImprovement?: number;
}

export interface IndexStats {
  name: string;
  size: number;
  tuples: number;
  scans: number;
  tuplesRead: number;
  tuplesReturned: number;
  blocksRead: number;
  blocksHit: number;
  lastUsed?: Date;
  createdAt: Date;
  isValid: boolean;
}

export interface IndexRecommendation {
  definition: IndexDefinition;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  cost: number;
  benefit: number;
  queries: string[];
}

export class IndexManager {
  private tenantId: string;
  private scheduledIndexes: Map<string, IndexDefinition> = new Map();
  private indexMonitoring: NodeJS.Timeout | null = null;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.startIndexMonitoring();
  }

  async createIndex(definition: IndexDefinition): Promise<void> {
    return tracer.startActiveSpan(
      'index_manager.create_index',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: this.tenantId,
          database_type: definition.database,
          index_name: definition.name,
          index_type: definition.type,
          priority: definition.priority,
        });

        const startTime = Date.now();

        try {
          if (definition.database === 'neo4j') {
            await this.createNeo4jIndex(definition);
          } else if (definition.database === 'postgresql') {
            await this.createPostgreSQLIndex(definition);
          }

          indexCreationTime.observe(
            { database_type: definition.database, index_type: definition.type },
            (Date.now() - startTime) / 1000,
          );

          indexOperations.inc({
            tenant_id: this.tenantId,
            database_type: definition.database,
            operation: 'create',
            result: 'success',
          });

          span.setAttributes({
            creation_time_ms: Date.now() - startTime,
            estimated_size: definition.estimatedSize || 0,
          });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          indexOperations.inc({
            tenant_id: this.tenantId,
            database_type: definition.database,
            operation: 'create',
            result: 'error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async createNeo4jIndex(definition: IndexDefinition): Promise<void> {
    const { name, label, properties, type, unique } = definition;

    if (!label || !properties) {
      throw new Error('Neo4j index requires label and properties');
    }

    let cypher = '';

    if (type === 'fulltext') {
      // Create fulltext index
      cypher = `CREATE FULLTEXT INDEX ${name} FOR (n:${label}) ON EACH [${properties.map((p) => `n.${p}`).join(', ')}]`;
    } else if (unique) {
      // Create unique constraint (which also creates an index)
      cypher = `CREATE CONSTRAINT ${name} FOR (n:${label}) REQUIRE n.${properties[0]} IS UNIQUE`;
    } else if (type === 'composite' && properties.length > 1) {
      // Create composite index
      cypher = `CREATE INDEX ${name} FOR (n:${label}) ON (${properties.map((p) => `n.${p}`).join(', ')})`;
    } else {
      // Create simple index
      cypher = `CREATE INDEX ${name} FOR (n:${label}) ON (n.${properties[0]})`;
    }

    await neo.run(cypher, {}, { tenantId: this.tenantId });
  }

  private async createPostgreSQLIndex(
    definition: IndexDefinition,
  ): Promise<void> {
    const {
      name,
      table,
      columns,
      type,
      unique,
      partial,
      condition,
      tenantScoped,
    } = definition;

    if (!table || !columns) {
      throw new Error('PostgreSQL index requires table and columns');
    }

    let sql = '';
    const indexColumns = columns.join(', ');
    const indexType = type === 'btree' ? '' : `USING ${type.toUpperCase()}`;
    const uniqueClause = unique ? 'UNIQUE ' : '';
    const tableName = tenantScoped ? `${table}_${this.tenantId}` : table;

    if (partial && condition) {
      sql = `CREATE ${uniqueClause}INDEX CONCURRENTLY ${name} ON ${tableName} ${indexType} (${indexColumns}) WHERE ${condition}`;
    } else {
      sql = `CREATE ${uniqueClause}INDEX CONCURRENTLY ${name} ON ${tableName} ${indexType} (${indexColumns})`;
    }

    await pool.query(sql);
  }

  async dropIndex(
    indexName: string,
    database: 'postgresql' | 'neo4j',
  ): Promise<void> {
    return tracer.startActiveSpan(
      'index_manager.drop_index',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: this.tenantId,
          database_type: database,
          index_name: indexName,
        });

        try {
          if (database === 'neo4j') {
            await neo.run(
              `DROP INDEX ${indexName}`,
              {},
              { tenantId: this.tenantId },
            );
          } else {
            await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`);
          }

          indexOperations.inc({
            tenant_id: this.tenantId,
            database_type: database,
            operation: 'drop',
            result: 'success',
          });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          indexOperations.inc({
            tenant_id: this.tenantId,
            database_type: database,
            operation: 'drop',
            result: 'error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async getIndexStats(database: 'postgresql' | 'neo4j'): Promise<IndexStats[]> {
    return tracer.startActiveSpan(
      'index_manager.get_stats',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: this.tenantId,
          database_type: database,
        });

        try {
          if (database === 'neo4j') {
            return await this.getNeo4jIndexStats();
          } else {
            return await this.getPostgreSQLIndexStats();
          }
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async getNeo4jIndexStats(): Promise<IndexStats[]> {
    const result = await neo.run(
      `
      CALL db.indexes() 
      YIELD name, labelsOrTypes, properties, state, type, size, uniqueness, provider
      RETURN name, labelsOrTypes, properties, state, type, size, uniqueness, provider
    `,
      {},
      { tenantId: this.tenantId },
    );

    return result.records.map((record) => ({
      name: record.get('name'),
      size: record.get('size') || 0,
      tuples: 0, // Neo4j doesn't provide this metric directly
      scans: 0, // Would need query log analysis
      tuplesRead: 0,
      tuplesReturned: 0,
      blocksRead: 0,
      blocksHit: 0,
      createdAt: new Date(), // Would need to track creation time separately
      isValid: record.get('state') === 'ONLINE',
    }));
  }

  private async getPostgreSQLIndexStats(): Promise<IndexStats[]> {
    const query = `
      SELECT 
        indexname as name,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size_pretty,
        pg_relation_size(indexname::regclass) as size,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_returned,
        idx_scan as scans,
        idx_blks_read as blocks_read,
        idx_blks_hit as blocks_hit,
        schemaname,
        tablename
      FROM pg_stat_user_indexes 
      JOIN pg_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexrelname
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexname::regclass) DESC;
    `;

    const result = await pool.query(query);

    return result.rows.map((row) => ({
      name: row.name,
      size: parseInt(row.size, 10) || 0,
      tuples: 0, // PostgreSQL doesn't track this for indexes
      scans: parseInt(row.scans, 10) || 0,
      tuplesRead: parseInt(row.tuples_read, 10) || 0,
      tuplesReturned: parseInt(row.tuples_returned, 10) || 0,
      blocksRead: parseInt(row.blocks_read, 10) || 0,
      blocksHit: parseInt(row.blocks_hit, 10) || 0,
      createdAt: new Date(), // Would need pg_stat_activity or catalog query
      isValid: true, // Would need to check pg_index.indisvalid
    }));
  }

  async generateIndexRecommendations(
    queryLog: string[],
  ): Promise<IndexRecommendation[]> {
    return tracer.startActiveSpan(
      'index_manager.generate_recommendations',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: this.tenantId,
          query_count: queryLog.length,
        });

        const recommendations: IndexRecommendation[] = [];

        try {
          // Analyze query patterns
          const patterns = this.analyzeQueryPatterns(queryLog);

          // Generate PostgreSQL recommendations
          const pgRecommendations =
            await this.generatePostgreSQLRecommendations(patterns);
          recommendations.push(...pgRecommendations);

          // Generate Neo4j recommendations
          const neo4jRecommendations =
            await this.generateNeo4jRecommendations(patterns);
          recommendations.push(...neo4jRecommendations);

          // Sort by benefit/cost ratio
          recommendations.sort(
            (a, b) => b.benefit / b.cost - a.benefit / a.cost,
          );

          span.setAttributes({
            recommendations_count: recommendations.length,
            high_impact_count: recommendations.filter(
              (r) => r.impact === 'high',
            ).length,
          });

          return recommendations;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private analyzeQueryPatterns(
    queryLog: string[],
  ): Map<string, { count: number; avgTime: number }> {
    const patterns = new Map();

    for (const query of queryLog) {
      const normalized = this.normalizeQuery(query);
      const existing = patterns.get(normalized) || { count: 0, avgTime: 0 };
      patterns.set(normalized, {
        count: existing.count + 1,
        avgTime: existing.avgTime, // Would need execution time data
      });
    }

    return patterns;
  }

  private normalizeQuery(query: string): string {
    // Normalize query by removing specific values and whitespace
    return query
      .toLowerCase()
      .replace(/\$\d+|'[^']*'|\d+/g, '?') // Replace parameters and literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private async generatePostgreSQLRecommendations(
    patterns: Map<string, { count: number; avgTime: number }>,
  ): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    for (const [pattern, stats] of patterns) {
      if (stats.count < 5) continue; // Only recommend for frequently used queries

      // Look for WHERE clause patterns
      const whereMatch = pattern.match(/where\s+([^=<>]+)\s*[=<>]/);
      if (whereMatch) {
        const column = whereMatch[1].trim();
        if (column.includes('.')) {
          const [table, columnName] = column.split('.');

          recommendations.push({
            definition: {
              name: `idx_${table}_${columnName}_${this.tenantId}`,
              database: 'postgresql',
              type: 'btree',
              table,
              columns: [columnName],
              tenantScoped: true,
              priority: stats.count > 50 ? 'high' : 'medium',
            },
            reason: `Frequent WHERE clause on ${column} (${stats.count} occurrences)`,
            impact: stats.count > 50 ? 'high' : 'medium',
            cost: 1000, // Estimated creation cost
            benefit: stats.count * 10, // Benefit based on frequency
            queries: [pattern],
          });
        }
      }

      // Look for ORDER BY patterns
      const orderMatch = pattern.match(/order\s+by\s+([^\s,]+)/);
      if (orderMatch) {
        const column = orderMatch[1].trim();
        if (column.includes('.')) {
          const [table, columnName] = column.split('.');

          recommendations.push({
            definition: {
              name: `idx_${table}_${columnName}_sort_${this.tenantId}`,
              database: 'postgresql',
              type: 'btree',
              table,
              columns: [columnName],
              tenantScoped: true,
              priority: 'medium',
            },
            reason: `Frequent ORDER BY on ${column} (${stats.count} occurrences)`,
            impact: 'medium',
            cost: 800,
            benefit: stats.count * 5,
            queries: [pattern],
          });
        }
      }
    }

    return recommendations;
  }

  private async generateNeo4jRecommendations(
    patterns: Map<string, { count: number; avgTime: number }>,
  ): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    for (const [pattern, stats] of patterns) {
      if (stats.count < 5) continue;

      // Look for MATCH patterns with property access
      const matchPattern = pattern.match(
        /match\s*\([^:]*:(\w+)[^}]*\{([^}]+)\}/,
      );
      if (matchPattern) {
        const label = matchPattern[1];
        const properties = matchPattern[2]
          .split(',')
          .map((prop) => prop.split(':')[0].trim())
          .filter((prop) => prop && prop !== 'tenant_id'); // Exclude tenant_id as it should already be indexed

        if (properties.length > 0) {
          recommendations.push({
            definition: {
              name: `idx_${label.toLowerCase()}_${properties.join('_')}_${this.tenantId}`,
              database: 'neo4j',
              type: properties.length > 1 ? 'composite' : 'btree',
              label,
              properties,
              tenantScoped: true,
              priority: stats.count > 50 ? 'high' : 'medium',
            },
            reason: `Frequent property lookup on ${label}.${properties.join(', ')} (${stats.count} occurrences)`,
            impact: stats.count > 50 ? 'high' : 'medium',
            cost: properties.length * 500, // Cost scales with property count
            benefit: stats.count * 15, // Neo4j indexes generally provide higher benefit
            queries: [pattern],
          });
        }
      }

      // Look for fulltext search patterns
      if (
        pattern.includes('contains') ||
        pattern.includes('starts with') ||
        pattern.includes('ends with')
      ) {
        const fulltextMatch = pattern.match(
          /(\w+)\.(\w+)\s+(?:contains|starts with|ends with)/,
        );
        if (fulltextMatch) {
          const label = fulltextMatch[1];
          const property = fulltextMatch[2];

          recommendations.push({
            definition: {
              name: `idx_fulltext_${label.toLowerCase()}_${property}_${this.tenantId}`,
              database: 'neo4j',
              type: 'fulltext',
              label,
              properties: [property],
              tenantScoped: true,
              priority: 'medium',
            },
            reason: `Frequent text search on ${label}.${property} (${stats.count} occurrences)`,
            impact: 'high',
            cost: 1500, // Fulltext indexes are more expensive
            benefit: stats.count * 20, // But provide significant benefit for text searches
            queries: [pattern],
          });
        }
      }
    }

    return recommendations;
  }

  async applyRecommendations(
    recommendations: IndexRecommendation[],
    limit: number = 10,
  ): Promise<void> {
    const selectedRecommendations = recommendations
      .slice(0, limit)
      .filter((rec) => rec.impact === 'high' || rec.benefit / rec.cost > 2);

    for (const recommendation of selectedRecommendations) {
      try {
        await this.createIndex(recommendation.definition);
        console.log(
          `Created recommended index: ${recommendation.definition.name}`,
        );
      } catch (error) {
        console.error(
          `Failed to create index ${recommendation.definition.name}:`,
          error,
        );
      }
    }
  }

  private startIndexMonitoring(): void {
    this.indexMonitoring = setInterval(async () => {
      try {
        await this.updateIndexMetrics();
      } catch (error) {
        console.error('Index monitoring error:', error);
      }
    }, 60000); // Update metrics every minute
  }

  private async updateIndexMetrics(): Promise<void> {
    // Update PostgreSQL index metrics
    try {
      const pgStats = await this.getIndexStats('postgresql');
      for (const stat of pgStats) {
        indexUsageStats.set(
          {
            tenant_id: this.tenantId,
            database_type: 'postgresql',
            index_name: stat.name,
            metric: 'scans',
          },
          stat.scans,
        );
        indexUsageStats.set(
          {
            tenant_id: this.tenantId,
            database_type: 'postgresql',
            index_name: stat.name,
            metric: 'tuples_read',
          },
          stat.tuplesRead,
        );
        indexSizeBytes.set(
          {
            tenant_id: this.tenantId,
            database_type: 'postgresql',
            index_name: stat.name,
          },
          stat.size,
        );
      }
    } catch (error) {
      console.error('Failed to update PostgreSQL index metrics:', error);
    }

    // Update Neo4j index metrics
    try {
      const neo4jStats = await this.getIndexStats('neo4j');
      for (const stat of neo4jStats) {
        indexSizeBytes.set(
          {
            tenant_id: this.tenantId,
            database_type: 'neo4j',
            index_name: stat.name,
          },
          stat.size,
        );
      }
    } catch (error) {
      console.error('Failed to update Neo4j index metrics:', error);
    }
  }

  async scheduleIndexCreation(
    definition: IndexDefinition,
    delayMs: number = 0,
  ): Promise<void> {
    this.scheduledIndexes.set(definition.name, definition);

    setTimeout(async () => {
      try {
        await this.createIndex(definition);
        this.scheduledIndexes.delete(definition.name);
      } catch (error) {
        console.error(
          `Scheduled index creation failed for ${definition.name}:`,
          error,
        );
      }
    }, delayMs);
  }

  getScheduledIndexes(): IndexDefinition[] {
    return Array.from(this.scheduledIndexes.values());
  }

  async validateIndexIntegrity(database: 'postgresql' | 'neo4j'): Promise<{
    valid: number;
    invalid: number;
    errors: Array<{ indexName: string; error: string }>;
  }> {
    const result = {
      valid: 0,
      invalid: 0,
      errors: [] as Array<{ indexName: string; error: string }>,
    };

    try {
      const stats = await this.getIndexStats(database);

      for (const stat of stats) {
        if (stat.isValid) {
          result.valid++;
        } else {
          result.invalid++;
          result.errors.push({
            indexName: stat.name,
            error: 'Index marked as invalid',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        indexName: 'unknown',
        error: (error as Error).message,
      });
    }

    return result;
  }

  cleanup(): void {
    if (this.indexMonitoring) {
      clearInterval(this.indexMonitoring);
      this.indexMonitoring = null;
    }
  }
}

export function createIndexManager(tenantId: string): IndexManager {
  return new IndexManager(tenantId);
}
