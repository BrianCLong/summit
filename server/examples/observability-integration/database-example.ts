/**
 * Example: Database Operations Integration
 *
 * Demonstrates how to integrate observability and cost guard into database operations
 * without modifying existing data access patterns.
 *
 * This example shows:
 * 1. Wrapping database queries with cost guard
 * 2. Tracing database operations with OpenTelemetry
 * 3. Collecting RED metrics for database queries
 * 4. Monitoring connection pool utilization (USE metrics)
 * 5. Enforcing query complexity budgets
 */

import { Pool } from 'pg';
import { Registry } from 'prom-client';

// Import observability and cost guard modules
import { tracer } from '../../src/observability/tracing';
import { createStandardMetrics } from '../../src/observability/standard-metrics';
import { withCostGuardDB, costGuard } from '../../src/cost-guard';

// ============================================================================
// 1. Initialize Observability
// ============================================================================

const registry = new Registry();
const { red, use } = createStandardMetrics(registry, {
  prefix: 'db_service',
  enabled: true,
});

// Configure database cost budgets
costGuard.setBudgetLimits('analytics-team', {
  daily: 10.0, // $10/day for analytics queries
  monthly: 200.0,
  query_burst: 2.0, // Allow expensive analytics queries
  rate_limit_cost: 5.0,
});

costGuard.setBudgetLimits('app-backend', {
  daily: 2.0, // $2/day for normal app queries
  monthly: 50.0,
  query_burst: 0.5,
  rate_limit_cost: 1.0,
});

// ============================================================================
// 2. Database Connection Pool with Monitoring
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'testdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Monitor connection pool metrics
setInterval(() => {
  const totalConnections = pool.totalCount;
  const activeConnections = pool.totalCount - pool.idleCount;
  const utilization = (activeConnections / pool.totalCount) * 100;

  use.recordUtilization('db_connection', utilization, {
    db_type: 'postgres',
    pool_name: 'main',
  });

  use.recordSaturation('db_connection', pool.waitingCount, {
    db_type: 'postgres',
  });

  console.log(`Pool: ${activeConnections}/${totalConnections} active, ${pool.waitingCount} waiting`);
}, 5000);

// ============================================================================
// 3. Original Data Access Layer (Unchanged Business Logic)
// ============================================================================

class UserRepository {
  // Simple query - no cost guard needed for basic operations
  async findById(id: string): Promise<any> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // List query - might need cost guard for large datasets
  async findAll(limit: number = 10): Promise<any[]> {
    const query = 'SELECT * FROM users LIMIT $1';
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Complex query - definitely needs cost guard
  async searchWithFilters(filters: any): Promise<any[]> {
    const query = `
      SELECT u.*, COUNT(p.id) as post_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE u.name ILIKE $1
        AND u.created_at > $2
      GROUP BY u.id
      HAVING COUNT(p.id) > $3
      ORDER BY post_count DESC
      LIMIT $4
    `;

    const result = await pool.query(query, [
      `%${filters.nameQuery}%`,
      filters.createdAfter,
      filters.minPosts,
      filters.limit || 100,
    ]);

    return result.rows;
  }

  // Analytics query - very expensive
  async getUserStatistics(dateRange: { start: Date; end: Date }): Promise<any> {
    const query = `
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as user_count,
        COUNT(CASE WHEN verified = true THEN 1 END) as verified_count,
        AVG(login_count) as avg_logins
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `;

    const result = await pool.query(query, [dateRange.start, dateRange.end]);
    return result.rows;
  }
}

// ============================================================================
// 4. Enhanced Repository with Observability & Cost Guard
// ============================================================================

class EnhancedUserRepository {
  private repo = new UserRepository();

  // Wrapper that calculates query complexity
  private estimateComplexity(queryType: string, params?: any): number {
    const baseComplexity: Record<string, number> = {
      findById: 1,
      findAll: 2,
      search: 5,
      analytics: 10,
    };

    let complexity = baseComplexity[queryType] || 1;

    // Adjust based on parameters
    if (params?.limit && params.limit > 100) {
      complexity *= 2;
    }

    if (params?.dateRange) {
      const days = Math.ceil(
        (params.dateRange.end.getTime() - params.dateRange.start.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      complexity *= Math.min(days / 7, 5); // Scale with date range
    }

    return complexity;
  }

  // Simple query - with tracing only
  async findById(id: string, tenantId: string, userId: string): Promise<any> {
    return tracer.traceDatabase('select', 'postgres', async () => {
      const stopTimer = red.database.startTimer({
        db_type: 'postgres',
        operation: 'select',
      });

      try {
        const result = await this.repo.findById(id);

        red.database.recordSuccess({
          db_type: 'postgres',
          operation: 'select',
        });

        return result;
      } catch (error) {
        red.database.recordError({
          db_type: 'postgres',
          operation: 'select',
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        });
        throw error;
      } finally {
        stopTimer({ operation: 'select' });
      }
    }, 'SELECT * FROM users WHERE id = $1');
  }

  // List query - with cost guard
  async findAll(
    limit: number,
    tenantId: string,
    userId: string,
  ): Promise<any[]> {
    const complexity = this.estimateComplexity('findAll', { limit });

    return withCostGuardDB(
      {
        tenantId,
        userId,
        operation: 'cypher_query', // Using existing operation type
        complexity,
        metadata: { queryType: 'findAll', limit },
      },
      async () => {
        return tracer.traceDatabase('select', 'postgres', async () => {
          const stopTimer = red.database.startTimer({
            db_type: 'postgres',
            operation: 'select',
          });

          try {
            const result = await this.repo.findAll(limit);

            red.database.recordSuccess({
              db_type: 'postgres',
              operation: 'select',
            });

            // Track result count for cost calculation
            use.recordLatency('db_query', stopTimer({ operation: 'select' }) / 1000);

            return result;
          } catch (error) {
            red.database.recordError({
              db_type: 'postgres',
              operation: 'select',
              error_type: error instanceof Error ? error.constructor.name : 'Unknown',
            });
            throw error;
          }
        });
      },
    );
  }

  // Complex search - with cost guard and complexity scaling
  async searchWithFilters(
    filters: any,
    tenantId: string,
    userId: string,
  ): Promise<any[]> {
    const complexity = this.estimateComplexity('search', filters);

    return withCostGuardDB(
      {
        tenantId,
        userId,
        operation: 'cypher_query',
        complexity,
        metadata: {
          queryType: 'searchWithFilters',
          filters,
        },
      },
      async () => {
        return tracer.traceDatabase('select', 'postgres', async () => {
          const stopTimer = red.database.startTimer({
            db_type: 'postgres',
            operation: 'select',
          });

          try {
            const result = await this.repo.searchWithFilters(filters);

            red.database.recordSuccess({
              db_type: 'postgres',
              operation: 'select',
            });

            return result;
          } catch (error) {
            red.database.recordError({
              db_type: 'postgres',
              operation: 'select',
              error_type: error instanceof Error ? error.constructor.name : 'Unknown',
            });
            throw error;
          } finally {
            stopTimer({ operation: 'select' });
          }
        });
      },
    );
  }

  // Analytics query - high cost, strict guard
  async getUserStatistics(
    dateRange: { start: Date; end: Date },
    tenantId: string,
    userId: string,
  ): Promise<any> {
    const complexity = this.estimateComplexity('analytics', { dateRange });

    return withCostGuardDB(
      {
        tenantId,
        userId,
        operation: 'cypher_query',
        complexity,
        metadata: {
          queryType: 'analytics',
          dateRange,
        },
      },
      async () => {
        return tracer.traceDatabase('select', 'postgres', async () => {
          const stopTimer = red.database.startTimer({
            db_type: 'postgres',
            operation: 'analytics',
          });

          try {
            const result = await this.repo.getUserStatistics(dateRange);

            red.database.recordSuccess({
              db_type: 'postgres',
              operation: 'analytics',
            });

            // Track analytics latency separately
            use.recordLatency('analytics_query', stopTimer({ operation: 'analytics' }) / 1000);

            return result;
          } catch (error) {
            red.database.recordError({
              db_type: 'postgres',
              operation: 'analytics',
              error_type: error instanceof Error ? error.constructor.name : 'Unknown',
            });
            throw error;
          }
        });
      },
    );
  }
}

// ============================================================================
// 5. Neo4j Example (Graph Database)
// ============================================================================

class GraphDatabaseRepository {
  // Simulated Neo4j driver
  private driver: any = {
    session: () => ({
      run: async (query: string, params: any) => {
        // Simulate query execution
        await new Promise(resolve => setTimeout(resolve, 50));
        return { records: [] };
      },
      close: () => {},
    }),
  };

  async findRelationships(
    entityId: string,
    depth: number,
    tenantId: string,
    userId: string,
  ): Promise<any> {
    // Graph traversal complexity grows exponentially with depth
    const complexity = Math.pow(2, depth);

    return withCostGuardDB(
      {
        tenantId,
        userId,
        operation: 'cypher_query',
        complexity,
        metadata: {
          queryType: 'graph_traversal',
          depth,
          entityId,
        },
      },
      async () => {
        return tracer.traceDatabase(
          'cypher',
          'neo4j',
          async () => {
            const stopTimer = red.database.startTimer({
              db_type: 'neo4j',
              operation: 'cypher',
            });

            const session = this.driver.session();

            try {
              const query = `
                MATCH (e:Entity {id: $entityId})-[*1..${depth}]-(related)
                RETURN related
              `;

              const result = await session.run(query, { entityId });

              red.database.recordSuccess({
                db_type: 'neo4j',
                operation: 'cypher',
              });

              return result.records;
            } catch (error) {
              red.database.recordError({
                db_type: 'neo4j',
                operation: 'cypher',
                error_type: error instanceof Error ? error.constructor.name : 'Unknown',
              });
              throw error;
            } finally {
              stopTimer({ operation: 'cypher' });
              await session.close();
            }
          },
          `MATCH (e:Entity {id: $entityId})-[*1..${depth}]-(related) RETURN related`,
        );
      },
    );
  }
}

// ============================================================================
// 6. Example Usage
// ============================================================================

export async function exampleUsage() {
  const userRepo = new EnhancedUserRepository();
  const graphRepo = new GraphDatabaseRepository();

  console.log('🗄️  Database Operations with Observability & Cost Guard\n');

  // Example 1: Simple query (allowed)
  try {
    console.log('1. Simple query (app-backend):');
    const user = await userRepo.findById('123', 'app-backend', 'user-1');
    console.log('   ✅ Query succeeded');
  } catch (error) {
    console.log('   ❌ Query failed:', (error as Error).message);
  }

  // Example 2: List query with moderate complexity
  try {
    console.log('\n2. List query (app-backend, limit: 50):');
    const users = await userRepo.findAll(50, 'app-backend', 'user-1');
    console.log(`   ✅ Retrieved ${users?.length || 0} users`);
  } catch (error) {
    console.log('   ❌ Query failed:', (error as Error).message);
  }

  // Example 3: Complex search (may hit budget)
  try {
    console.log('\n3. Complex search (app-backend):');
    const results = await userRepo.searchWithFilters(
      {
        nameQuery: 'john',
        createdAfter: new Date('2024-01-01'),
        minPosts: 5,
        limit: 100,
      },
      'app-backend',
      'user-1',
    );
    console.log(`   ✅ Found ${results?.length || 0} matching users`);
  } catch (error) {
    console.log('   ❌ Query blocked:', (error as Error).message);
  }

  // Example 4: Analytics query (allowed for analytics team)
  try {
    console.log('\n4. Analytics query (analytics-team):');
    const stats = await userRepo.getUserStatistics(
      {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      },
      'analytics-team',
      'analyst-1',
    );
    console.log(`   ✅ Generated statistics: ${stats?.length || 0} data points`);
  } catch (error) {
    console.log('   ❌ Query blocked:', (error as Error).message);
  }

  // Example 5: Graph traversal with depth limit
  try {
    console.log('\n5. Graph traversal (analytics-team, depth: 3):');
    const relationships = await graphRepo.findRelationships(
      'entity-123',
      3,
      'analytics-team',
      'analyst-1',
    );
    console.log(`   ✅ Found ${relationships?.length || 0} relationships`);
  } catch (error) {
    console.log('   ❌ Query blocked:', (error as Error).message);
  }

  // Example 6: Budget analysis
  console.log('\n6. Budget Analysis:');
  const appBackendAnalysis = await costGuard.getCostAnalysis('app-backend');
  const analyticsAnalysis = await costGuard.getCostAnalysis('analytics-team');

  console.log('\n   app-backend:');
  console.log(`     Daily usage: $${appBackendAnalysis.currentUsage.daily.toFixed(4)}`);
  console.log(`     Daily limit: $${appBackendAnalysis.limits.daily.toFixed(2)}`);
  console.log(`     Utilization: ${(appBackendAnalysis.utilization.daily * 100).toFixed(1)}%`);

  console.log('\n   analytics-team:');
  console.log(`     Daily usage: $${analyticsAnalysis.currentUsage.daily.toFixed(4)}`);
  console.log(`     Daily limit: $${analyticsAnalysis.limits.daily.toFixed(2)}`);
  console.log(`     Utilization: ${(analyticsAnalysis.utilization.daily * 100).toFixed(1)}%`);

  // Cleanup
  await pool.end();
}

// ============================================================================
// 7. Key Takeaways
// ============================================================================

/*
 * INTEGRATION SUMMARY:
 *
 * 1. NO CHANGES to original repository
 *    - UserRepository class remains unchanged
 *    - Business logic completely isolated
 *
 * 2. Enhanced repository wraps original
 *    - Adds cost guard and observability
 *    - Calculates query complexity automatically
 *    - Original methods still work
 *
 * 3. Dynamic complexity calculation
 *    - Based on query type, parameters, date ranges
 *    - Exponential scaling for graph traversals
 *
 * 4. Connection pool monitoring
 *    - Utilization tracked with USE metrics
 *    - Saturation (queue depth) monitored
 *    - Automatic alerts when pool exhausted
 *
 * 5. Per-tenant budgets
 *    - Different limits for different use cases
 *    - analytics-team: Higher budgets for complex queries
 *    - app-backend: Lower budgets, optimized queries
 *
 * 6. Performance targets
 *    - Simple queries: < 10ms
 *    - Complex queries: < 500ms
 *    - Analytics: < 2s
 *    - p95 < 1.5s for typical workloads
 *
 * 7. Comprehensive observability
 *    - OpenTelemetry traces for all operations
 *    - RED metrics for query patterns
 *    - USE metrics for resource monitoring
 *    - Cost tracking and budget enforcement
 */
