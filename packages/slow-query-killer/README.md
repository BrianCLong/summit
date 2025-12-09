# @intelgraph/slow-query-killer

Slow query killer with cost budgeting and graceful degradation for IntelGraph databases.

## Features

- ⏱️ **Time-based budgets** - Kill queries exceeding max execution time
- 💰 **Cost-based budgets** - Kill queries exceeding cost thresholds
- 🎯 **Tenant-specific budgets** - Per-tenant query limits
- 🔍 **Query complexity analysis** - Analyze Cypher and SQL complexity
- 📊 **Cost estimation** - Estimate query costs before execution
- ⚠️ **Soft warnings** - Issue warnings before killing queries
- 📈 **Statistics tracking** - Track kills, warnings, and cost savings
- 🚦 **Concurrent query limits** - Limit concurrent queries per tenant

## Installation

```bash
pnpm add @intelgraph/slow-query-killer
```

## Usage

### Basic Setup

```typescript
import { SlowQueryKiller } from '@intelgraph/slow-query-killer';

const killer = new SlowQueryKiller({
  maxExecutionTimeMs: 5000, // 5 seconds max
  maxCostDollars: 0.1, // $0.10 max per query
  softThreshold: 0.8, // Warn at 80%
  killEnabled: true,
});

// Set tenant-specific budget
killer.setTenantBudget('tenant-123', {
  maxExecutionTimeMs: 3000, // 3 seconds for this tenant
  maxCostDollars: 0.05,
  maxConcurrentQueries: 10,
  maxComplexity: 50,
});
```

### Monitoring Queries

```typescript
import { QueryComplexityAnalyzer, QueryCostEstimator } from '@intelgraph/slow-query-killer';

// Before executing query
const cypher = 'MATCH (a:Person)-[*1..3]->(b:Person) RETURN a, b';
const complexity = QueryComplexityAnalyzer.analyzeCypherComplexity(cypher);
const estimatedCost = QueryCostEstimator.estimateNeo4jCost(cypher, 100);

// Register query for monitoring
killer.registerQuery({
  queryId: 'unique-query-id',
  tenantId: 'tenant-123',
  database: 'neo4j',
  query: cypher,
  estimatedCost,
  complexity,
  startTime: new Date(),
});

// Execute query...
const result = await session.run(cypher);

// Unregister when complete
killer.unregisterQuery('unique-query-id');
```

### Auto-Kill Integration

```typescript
// Listen for queries that should be killed
killer.on('should_kill_query', async (event) => {
  console.log(`Killing query ${event.queryId}: ${event.reason}`);

  // Kill the query in the database
  await killer.killQuery(event.queryId, 'neo4j', neo4jDriver);
});

// Listen for warnings
killer.on('query_warning', (event) => {
  console.warn(
    `Query ${event.queryId} approaching limits: ` +
      `${event.timePercentage.toFixed(1)}% of time budget, ` +
      `${event.costPercentage.toFixed(1)}% of cost budget`
  );
});

// Listen for kills
killer.on('query_killed', (event) => {
  console.log(
    `Killed query ${event.queryId} for ${event.tenantId}: ` +
      `${event.reason}. Cost saved: $${event.costSaved.toFixed(4)}`
  );
});
```

### With GraphQL/Express

```typescript
import { createQueryBudgetMiddleware } from '@intelgraph/slow-query-killer';

const app = express();

// Add middleware to enforce concurrent query limits
app.use(createQueryBudgetMiddleware(killer));

// Your routes...
app.post('/graphql', async (req, res) => {
  const tenantId = req.user.tenantId;
  const queryId = generateQueryId();

  // Register query
  killer.registerQuery({
    queryId,
    tenantId,
    database: 'neo4j',
    query: req.body.query,
    estimatedCost: 0.01,
    startTime: new Date(),
  });

  try {
    const result = await executeGraphQL(req.body.query);
    res.json(result);
  } finally {
    killer.unregisterQuery(queryId);
  }
});
```

## Query Complexity Analysis

### Cypher Complexity

```typescript
import { QueryComplexityAnalyzer } from '@intelgraph/slow-query-killer';

// Simple query: low complexity
const simple = 'MATCH (n:Person) RETURN n LIMIT 10';
console.log(QueryComplexityAnalyzer.analyzeCypherComplexity(simple)); // ~5

// Variable length paths: medium complexity
const varLength = 'MATCH (a)-[*1..3]->(b) RETURN a, b';
console.log(QueryComplexityAnalyzer.analyzeCypherComplexity(varLength)); // ~20

// Unbounded paths: high complexity
const unbounded = 'MATCH (a)-[*]->(b) RETURN a, b';
console.log(QueryComplexityAnalyzer.analyzeCypherComplexity(unbounded)); // ~55+
```

### SQL Complexity

```typescript
// Simple query: low complexity
const simple = 'SELECT * FROM users WHERE id = 1';
console.log(QueryComplexityAnalyzer.analyzeSQLComplexity(simple)); // ~0

// With JOINs: medium complexity
const withJoins = `
  SELECT * FROM users u
  INNER JOIN orders o ON u.id = o.user_id
  LEFT JOIN payments p ON o.id = p.order_id
`;
console.log(QueryComplexityAnalyzer.analyzeSQLComplexity(withJoins)); // ~10

// With subqueries and CTEs: high complexity
const complex = `
  WITH high_earners AS (
    SELECT * FROM employees WHERE salary > 100000
  )
  SELECT * FROM high_earners
  WHERE id IN (SELECT manager_id FROM departments)
`;
console.log(QueryComplexityAnalyzer.analyzeSQLComplexity(complex)); // ~17+
```

## Cost Estimation

```typescript
import { QueryCostEstimator } from '@intelgraph/slow-query-killer';

// Estimate Neo4j query cost
const neo4jCost = QueryCostEstimator.estimateNeo4jCost(
  'MATCH (a:Person)-[*1..3]->(b:Person) RETURN a, b',
  100 // estimated result count
);
console.log(`Estimated Neo4j cost: $${neo4jCost.toFixed(4)}`);

// Estimate PostgreSQL query cost
const pgCost = QueryCostEstimator.estimatePostgresCost(
  'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
  1000 // estimated rows
);
console.log(`Estimated PostgreSQL cost: $${pgCost.toFixed(4)}`);
```

## Statistics

```typescript
// Get overall statistics
const stats = killer.getStats();
console.log(stats);
/* {
  totalQueries: 1250,
  killedQueries: 15,
  warningsIssued: 87,
  totalCostSaved: 1.23,
  killsByReason: {
    'Exceeded max execution time: 6000ms > 5000ms': 10,
    'Exceeded max cost: $0.12 > $0.10': 5
  }
} */

// Get running queries
const runningQueries = killer.getRunningQueries('tenant-123');
console.log(`Tenant has ${runningQueries.length} running queries`);
```

## Events

The `SlowQueryKiller` emits the following events:

```typescript
// Query registered
killer.on('query_registered', (event) => {
  // { queryId, tenantId, database }
});

// Query warning (approaching limits)
killer.on('query_warning', (event) => {
  // { queryId, tenantId, executionTimeMs, costIncurred, timePercentage, costPercentage }
});

// Should kill query (automatic detection)
killer.on('should_kill_query', (event) => {
  // { queryId, reason, executionTimeMs, costIncurred }
});

// Query killed
killer.on('query_killed', (event) => {
  // { queryId, tenantId, database, reason, executionTimeMs, costIncurred, costSaved }
});

// Concurrent limit exceeded
killer.on('concurrent_limit_exceeded', (event) => {
  // { tenantId, limit, current }
});

// Complexity limit exceeded
killer.on('complexity_limit_exceeded', (event) => {
  // { tenantId, limit, actual, queryId }
});

// Tenant budget set
killer.on('tenant_budget_set', (event) => {
  // { tenantId, budget }
});

// Kill error
killer.on('kill_error', (event) => {
  // { queryId, database, error }
});
```

## Integration with Metrics

```typescript
import { MetricsExporter } from '@intelgraph/metrics-exporter';

const metrics = new MetricsExporter({ serviceName: 'api' });

// Record slow query kills in metrics
killer.on('query_killed', (event) => {
  metrics.recordSlowQueryKill(event.database, event.tenantId);
  metrics.recordCost({
    tenantId: event.tenantId,
    operation: 'query_kill',
    cost: -event.costSaved, // Negative cost = savings
    resourceType: 'compute',
  });
});

// Track budget utilization
setInterval(() => {
  const budgets = killer.getRunningQueries()
    .reduce((acc, q) => {
      const budget = killer.getTenantBudget(q.tenantId);
      if (budget) {
        acc.set(q.tenantId, budget);
      }
      return acc;
    }, new Map());

  for (const [tenantId, budget] of budgets.entries()) {
    const queries = killer.getRunningQueries(tenantId);
    const utilization = (queries.length / (budget.maxConcurrentQueries || 10)) * 100;
    metrics.updateBudgetUtilization(tenantId, 'concurrent_queries', utilization);
  }
}, 10000); // Every 10 seconds
```

## Best Practices

1. **Set realistic budgets** - Don't make budgets too aggressive
2. **Use soft thresholds** - Warn before killing (e.g., 80% threshold)
3. **Monitor warnings** - Investigate queries that frequently approach limits
4. **Tenant-specific budgets** - Premium tenants can have higher limits
5. **Graceful degradation** - Consider partial results instead of killing
6. **Cost estimation** - Always estimate before executing expensive queries
7. **Complexity limits** - Block extremely complex queries at GraphQL layer
8. **Circuit breakers** - Integrate with cost guardrails for full protection

## License

MIT
