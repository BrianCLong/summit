import {
  SlowQueryKiller,
  QueryComplexityAnalyzer,
  QueryCostEstimator,
  QueryBudget,
  QueryContext,
} from './index';

describe('SlowQueryKiller', () => {
  let killer: SlowQueryKiller;
  const defaultBudget: QueryBudget = {
    maxExecutionTimeMs: 5000,
    maxCostDollars: 0.1,
    softThreshold: 0.8,
    killEnabled: true,
  };

  beforeEach(() => {
    killer = new SlowQueryKiller(defaultBudget);
  });

  afterEach(() => {
    killer.stop();
  });

  describe('Query Registration', () => {
    it('should register a query', () => {
      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n LIMIT 10',
        estimatedCost: 0.01,
        startTime: new Date(),
      };

      killer.registerQuery(context);

      const runningQueries = killer.getRunningQueries('tenant-1');
      expect(runningQueries).toHaveLength(1);
      expect(runningQueries[0].queryId).toBe('query-1');
    });

    it('should unregister a completed query', () => {
      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n LIMIT 10',
        estimatedCost: 0.01,
        startTime: new Date(),
      };

      killer.registerQuery(context);
      killer.unregisterQuery('query-1');

      const runningQueries = killer.getRunningQueries('tenant-1');
      expect(runningQueries).toHaveLength(0);
    });

    it('should emit event when query registered', (done) => {
      killer.on('query_registered', (event) => {
        expect(event.queryId).toBe('query-1');
        expect(event.tenantId).toBe('tenant-1');
        done();
      });

      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n',
        estimatedCost: 0.01,
        startTime: new Date(),
      };

      killer.registerQuery(context);
    });
  });

  describe('Tenant Budgets', () => {
    it('should set tenant budget', () => {
      killer.setTenantBudget('tenant-1', {
        maxExecutionTimeMs: 3000,
        maxCostDollars: 0.05,
      });

      const budget = killer.getTenantBudget('tenant-1');
      expect(budget?.maxExecutionTimeMs).toBe(3000);
      expect(budget?.maxCostDollars).toBe(0.05);
    });

    it('should use default budget for unknown tenant', () => {
      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'unknown-tenant',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n',
        estimatedCost: 0.01,
        startTime: new Date(),
      };

      killer.registerQuery(context);
      const result = killer.shouldKillQuery('query-1');
      expect(result.killed).toBe(false);
    });

    it('should clear all tenant budgets', () => {
      killer.setTenantBudget('tenant-1', { maxExecutionTimeMs: 3000 });
      killer.setTenantBudget('tenant-2', { maxExecutionTimeMs: 4000 });

      killer.clearTenantBudgets();

      expect(killer.getTenantBudget('tenant-1')).toBeUndefined();
      expect(killer.getTenantBudget('tenant-2')).toBeUndefined();
    });
  });

  describe('Query Kill Detection', () => {
    it('should not kill query within budget', () => {
      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n LIMIT 10',
        estimatedCost: 0.01,
        startTime: new Date(),
      };

      killer.registerQuery(context);
      const result = killer.shouldKillQuery('query-1');

      expect(result.killed).toBe(false);
    });

    it('should kill query exceeding time budget', (done) => {
      killer.setTenantBudget('tenant-1', {
        maxExecutionTimeMs: 100, // Very short timeout
      });

      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n',
        estimatedCost: 0.01,
        startTime: new Date(Date.now() - 200), // Started 200ms ago
      };

      killer.registerQuery(context);

      setTimeout(() => {
        const result = killer.shouldKillQuery('query-1');
        expect(result.killed).toBe(true);
        expect(result.reason).toContain('execution time');
        done();
      }, 50);
    });

    it('should emit warning when approaching budget', (done) => {
      killer.setTenantBudget('tenant-1', {
        maxExecutionTimeMs: 1000,
        softThreshold: 0.5,
      });

      killer.on('query_warning', (event) => {
        expect(event.queryId).toBe('query-1');
        expect(event.timePercentage).toBeGreaterThan(50);
        done();
      });

      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n',
        estimatedCost: 0.01,
        startTime: new Date(Date.now() - 600), // Started 600ms ago (60% of budget)
      };

      killer.registerQuery(context);
      killer.shouldKillQuery('query-1');
    });
  });

  describe('Concurrent Query Limits', () => {
    it('should emit event when concurrent limit exceeded', (done) => {
      killer.setTenantBudget('tenant-1', {
        maxConcurrentQueries: 2,
      });

      killer.on('concurrent_limit_exceeded', (event) => {
        expect(event.tenantId).toBe('tenant-1');
        expect(event.limit).toBe(2);
        expect(event.current).toBe(2);
        done();
      });

      // Register 3 queries
      for (let i = 0; i < 3; i++) {
        killer.registerQuery({
          queryId: `query-${i}`,
          tenantId: 'tenant-1',
          database: 'neo4j',
          query: 'MATCH (n) RETURN n',
          estimatedCost: 0.01,
          startTime: new Date(),
        });
      }
    });
  });

  describe('Query Complexity Limits', () => {
    it('should emit event when complexity limit exceeded', (done) => {
      killer.setTenantBudget('tenant-1', {
        maxComplexity: 20,
      });

      killer.on('complexity_limit_exceeded', (event) => {
        expect(event.tenantId).toBe('tenant-1');
        expect(event.limit).toBe(20);
        expect(event.actual).toBe(50);
        done();
      });

      killer.registerQuery({
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n',
        estimatedCost: 0.01,
        complexity: 50,
        startTime: new Date(),
      });
    });
  });

  describe('Statistics', () => {
    it('should track query statistics', () => {
      const context: QueryContext = {
        queryId: 'query-1',
        tenantId: 'tenant-1',
        database: 'neo4j',
        query: 'MATCH (n) RETURN n',
        estimatedCost: 0.01,
        startTime: new Date(),
      };

      killer.registerQuery(context);
      const stats = killer.getStats();

      expect(stats.totalQueries).toBe(1);
      expect(stats.killedQueries).toBe(0);
    });
  });
});

describe('QueryComplexityAnalyzer', () => {
  describe('Cypher Complexity', () => {
    it('should analyze simple MATCH query', () => {
      const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(
        'MATCH (n:Person) RETURN n LIMIT 10'
      );
      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(20);
    });

    it('should detect variable length paths', () => {
      const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(
        'MATCH (a)-[*1..3]->(b) RETURN a, b'
      );
      expect(complexity).toBeGreaterThan(15);
    });

    it('should heavily penalize unbounded paths', () => {
      const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(
        'MATCH (a)-[*]->(b) RETURN a, b'
      );
      expect(complexity).toBeGreaterThan(50);
    });

    it('should detect aggregations', () => {
      const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(
        'MATCH (n:Person) RETURN count(n), sum(n.age), avg(n.salary)'
      );
      expect(complexity).toBeGreaterThan(10);
    });

    it('should detect optional matches', () => {
      const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(
        'MATCH (n:Person) OPTIONAL MATCH (n)-[:WORKS_AT]->(c:Company) RETURN n, c'
      );
      expect(complexity).toBeGreaterThan(10);
    });
  });

  describe('SQL Complexity', () => {
    it('should analyze simple SELECT query', () => {
      const complexity = QueryComplexityAnalyzer.analyzeSQLComplexity(
        'SELECT * FROM users WHERE id = 1'
      );
      expect(complexity).toBeGreaterThanOrEqual(0);
      expect(complexity).toBeLessThan(10);
    });

    it('should detect JOINs', () => {
      const complexity = QueryComplexityAnalyzer.analyzeSQLComplexity(
        'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id'
      );
      expect(complexity).toBeGreaterThan(5);
    });

    it('should detect subqueries', () => {
      const complexity = QueryComplexityAnalyzer.analyzeSQLComplexity(
        'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)'
      );
      expect(complexity).toBeGreaterThan(10);
    });

    it('should detect window functions', () => {
      const complexity = QueryComplexityAnalyzer.analyzeSQLComplexity(
        'SELECT ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary) FROM employees'
      );
      expect(complexity).toBeGreaterThan(10);
    });

    it('should detect CTEs', () => {
      const complexity = QueryComplexityAnalyzer.analyzeSQLComplexity(
        'WITH high_earners AS (SELECT * FROM employees WHERE salary > 100000) SELECT * FROM high_earners'
      );
      expect(complexity).toBeGreaterThan(5);
    });
  });
});

describe('QueryCostEstimator', () => {
  describe('Neo4j Cost Estimation', () => {
    it('should estimate simple query cost', () => {
      const cost = QueryCostEstimator.estimateNeo4jCost(
        'MATCH (n:Person) RETURN n LIMIT 10',
        10
      );
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01);
    });

    it('should estimate higher cost for complex queries', () => {
      const simpleCost = QueryCostEstimator.estimateNeo4jCost(
        'MATCH (n:Person) RETURN n LIMIT 10',
        10
      );
      const complexCost = QueryCostEstimator.estimateNeo4jCost(
        'MATCH (a:Person)-[*1..5]->(b:Person) RETURN a, b',
        100
      );
      expect(complexCost).toBeGreaterThan(simpleCost);
    });
  });

  describe('PostgreSQL Cost Estimation', () => {
    it('should estimate simple query cost', () => {
      const cost = QueryCostEstimator.estimatePostgresCost(
        'SELECT * FROM users WHERE id = 1',
        1
      );
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.001);
    });

    it('should estimate higher cost for complex queries', () => {
      const simpleCost = QueryCostEstimator.estimatePostgresCost(
        'SELECT * FROM users LIMIT 10',
        10
      );
      const complexCost = QueryCostEstimator.estimatePostgresCost(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE EXISTS (SELECT 1 FROM payments WHERE payments.order_id = orders.id)',
        1000
      );
      expect(complexCost).toBeGreaterThan(simpleCost);
    });
  });
});
