# Observability & Cost Guard Rails

Comprehensive infrastructure modules for OpenTelemetry tracing, Prometheus metrics, and cost budgeting across IntelGraph services.

## Overview

This documentation describes how to adopt observability and cost guard patterns in your service **without breaking changes** to existing business logic.

### What's Included

- **OpenTelemetry Tracing**: Distributed tracing across services with automatic instrumentation
- **Prometheus Metrics**: RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) metrics
- **Cost Guard Middleware**: Query budget enforcement and rate limiting per tenant
- **Drop-in Integration**: No changes to business logic required

## Table of Contents

1. [Quick Start](#quick-start)
2. [Observability Module](#observability-module)
3. [Cost Guard Module](#cost-guard-module)
4. [Configuration](#configuration)
5. [Integration Examples](#integration-examples)
6. [Testing](#testing)
7. [Performance Targets](#performance-targets)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

The modules are already part of the monorepo. Import them directly:

```typescript
// Observability
import { tracer, createStandardMetrics } from '@/observability';

// Cost Guard
import {
  costGuardMiddleware,
  withCostGuard
} from '@/cost-guard';
```

### Basic Integration (Express)

```typescript
import express from 'express';
import { Registry } from 'prom-client';
import { createStandardMetrics } from '@/observability';
import { costGuardMiddleware, costRecordingMiddleware } from '@/cost-guard';

const app = express();
const registry = new Registry();
const { red, use } = createStandardMetrics(registry);

// Apply cost guard middleware
app.use(costGuardMiddleware());
app.use(costRecordingMiddleware());

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

That's it! Your service now has cost budgeting and metrics collection.

---

## Observability Module

### OpenTelemetry Tracing

#### Automatic Tracing

The tracing service auto-instruments Node.js operations:

```typescript
import { tracer } from '@/observability';

// Tracer is automatically initialized
// No additional setup needed
```

#### Manual Tracing

Wrap any operation with tracing:

```typescript
// Generic trace wrapper
const result = await tracer.trace('operation.name', async (span) => {
  span.setAttribute('custom.key', 'value');
  span.setAttribute('query.id', queryId);

  return await performOperation();
});
```

#### Database Tracing

```typescript
// PostgreSQL
const users = await tracer.traceDatabase(
  'select',
  'postgres',
  async () => await pool.query('SELECT * FROM users'),
  'SELECT * FROM users' // Optional query string
);

// Neo4j
const graph = await tracer.traceDatabase(
  'cypher',
  'neo4j',
  async () => await session.run('MATCH (n) RETURN n'),
  'MATCH (n) RETURN n'
);

// Redis
const cached = await tracer.traceDatabase(
  'get',
  'redis',
  async () => await redis.get('key'),
  'GET key'
);
```

#### GraphQL Tracing

```typescript
const result = await tracer.traceGraphQL(
  'getUser',
  'user',
  async () => await fetchUser(id),
  context // Optional context with user info
);
```

#### Queue Tracing

```typescript
const result = await tracer.traceQueue(
  'email-queue',
  'send-email',
  async () => await processEmailJob(data)
);
```

#### HTTP Tracing

```typescript
const response = await tracer.traceHTTP(
  'POST',
  'https://api.external.com/data',
  async () => await axios.post(url, data)
);
```

### Prometheus Metrics

#### RED Metrics (Request-Driven Services)

**Rate, Errors, Duration** - for services handling requests:

```typescript
import { createStandardMetrics } from '@/observability/standard-metrics';
import { Registry } from 'prom-client';

const registry = new Registry();
const { red } = createStandardMetrics(registry);

// HTTP Requests
const stopTimer = red.http.startTimer({
  method: 'GET',
  route: '/api/users',
});

try {
  const result = await fetchUsers();

  red.http.recordSuccess({
    method: 'GET',
    route: '/api/users',
    status_code: 200,
  });

  return result;
} catch (error) {
  red.http.recordError({
    method: 'GET',
    route: '/api/users',
    error_type: error.constructor.name,
  });
  throw error;
} finally {
  stopTimer({ status_code: '200' });
}

// GraphQL Operations
const stopGqlTimer = red.graphql.startTimer({
  operation_name: 'GetUser',
  operation_type: 'query',
});

red.graphql.recordSuccess({
  operation_name: 'GetUser',
  operation_type: 'query',
});

stopGqlTimer({ operation_type: 'query' });

// Database Queries
const stopDbTimer = red.database.startTimer({
  db_type: 'postgres',
  operation: 'select',
});

red.database.recordSuccess({
  db_type: 'postgres',
  operation: 'select',
});

stopDbTimer({ operation: 'select' });
```

#### USE Metrics (Resource Monitoring)

**Utilization, Saturation, Errors** - for system resources:

```typescript
const { use } = createStandardMetrics(registry);

// Utilization (% busy)
use.recordUtilization('cpu', 75.5);
use.recordUtilization('memory', 82.0);
use.recordUtilization('db_connection', 60.0, {
  db_type: 'postgres',
  pool_name: 'main',
});

// Saturation (queue depth)
use.recordSaturation('request', 15, { queue_type: 'http' });
use.recordSaturation('db_connection', 5, { db_type: 'postgres' });
use.recordSaturation('job', 100, { queue_name: 'email' });

// Errors
use.recordSystemError('OutOfMemory', 'runtime');
use.recordResourceError('database', 'ConnectionPoolExhausted');

// Latency percentiles (for SLOs)
use.recordLatency('graphql_query', 0.125); // 125ms in seconds
```

---

## Cost Guard Module

### Middleware Integration

#### Express Middleware

```typescript
import { costGuardMiddleware, costRecordingMiddleware } from '@/cost-guard';

// Apply to all routes
app.use(costGuardMiddleware({
  extractTenantId: (req) => req.headers['x-tenant-id'] as string,
  extractUserId: (req) => req.headers['x-user-id'] as string,
  skipPaths: ['/health', '/metrics'],
  onBudgetExceeded: (context, reason) => {
    logger.warn(`Budget exceeded: ${reason}`, context);
  },
}));

app.use(costRecordingMiddleware());
```

#### Configuration

```typescript
import { costGuard } from '@/cost-guard';

// Set budget limits per tenant
costGuard.setBudgetLimits('tenant-id', {
  daily: 10.0,        // $10/day
  monthly: 250.0,     // $250/month
  query_burst: 1.0,   // $1 max per query
  rate_limit_cost: 5.0, // Start rate limiting at $5
});
```

### Wrapping Operations

#### Generic Operation Wrapper

```typescript
import { withCostGuard } from '@/cost-guard';

const result = await withCostGuard({
  tenantId: 'acme-corp',
  userId: 'user-123',
  operation: 'cypher_query',
  complexity: 8, // Higher = more expensive
  metadata: { queryType: 'search' },
}, async () => {
  return await executeExpensiveQuery(query);
});
```

#### GraphQL Resolver Wrapper

```typescript
import { withCostGuardResolver } from '@/cost-guard';

const resolvers = {
  Query: {
    // Simple query
    user: withCostGuardResolver(
      async (parent, args, context) => {
        return await fetchUser(args.id);
      },
      { operation: 'graphql_query', complexity: 1 }
    ),

    // Expensive search
    searchUsers: withCostGuardResolver(
      async (parent, args, context) => {
        return await complexSearch(args.query);
      },
      { operation: 'graphql_query', complexity: 10 }
    ),
  },
};
```

#### Database Operation Wrapper

```typescript
import { withCostGuardDB } from '@/cost-guard';

const results = await withCostGuardDB({
  tenantId: 'acme-corp',
  userId: 'user-123',
  operation: 'cypher_query',
  complexity: 15,
}, async () => {
  return await neo4j.run(complexCypherQuery);
});
```

#### Export Operation Wrapper

```typescript
import { withCostGuardExport } from '@/cost-guard';

const exportData = await withCostGuardExport({
  tenantId: 'acme-corp',
  userId: 'user-123',
  complexity: 20, // Exports are expensive
}, async () => {
  return await generateLargeExport();
});
```

### Error Handling

```typescript
import { CostGuardError } from '@/cost-guard';

try {
  await withCostGuard(context, operation);
} catch (error) {
  if (error instanceof CostGuardError) {
    console.error('Budget exceeded!');
    console.error('Remaining budget:', error.budgetRemaining);
    console.error('Estimated cost:', error.estimatedCost);
    console.error('Warnings:', error.warnings);

    // Return user-friendly error
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: error.message,
      retryAfter: '1h',
    });
  }
  throw error;
}
```

### Budget Analysis

```typescript
import { costGuard } from '@/cost-guard';

// Get cost analysis for a tenant
const analysis = await costGuard.getCostAnalysis('tenant-id');

console.log('Current usage:', analysis.currentUsage);
console.log('Limits:', analysis.limits);
console.log('Utilization:', analysis.utilization);
console.log('Projected spend:', analysis.projectedMonthlySpend);
console.log('Recommendations:', analysis.recommendations);

// Generate cost report
const report = await costGuard.generateCostReport('tenant-id', 30);

console.log('Total cost:', report.totalCost);
console.log('Average daily cost:', report.averageDailyCost);
console.log('Operation breakdown:', report.operationBreakdown);
```

---

## Configuration

### Environment Variables

```bash
# OpenTelemetry Tracing
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=2.5.0
OTEL_ENABLED=true
OTEL_SAMPLE_RATE=0.1  # 10% sampling
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Prometheus Metrics
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9464

# Cost Guard
COST_GUARD_ENABLED=true
```

### Programmatic Configuration

```typescript
import { TracingService } from '@/observability/tracing';

const tracer = TracingService.getInstance({
  serviceName: 'my-service',
  serviceVersion: '2.5.0',
  environment: 'production',
  jaegerEndpoint: 'http://jaeger:14268/api/traces',
  prometheusPort: 9464,
  sampleRate: 0.1,
  enabled: true,
});
```

---

## Integration Examples

### Example 1: GraphQL Service

See [`examples/observability-integration/graphql-example.ts`](../examples/observability-integration/graphql-example.ts)

This example demonstrates:
- Cost guard wrapper for GraphQL resolvers
- Automatic budget enforcement
- Tracing for all GraphQL operations
- RED metrics for queries/mutations
- Per-tenant budget isolation

### Example 2: Database Operations

See [`examples/observability-integration/database-example.ts`](../examples/observability-integration/database-example.ts)

This example demonstrates:
- Wrapping database queries with cost guard
- Dynamic complexity calculation
- Connection pool monitoring
- Neo4j graph traversal with exponential complexity
- Budget differentiation (analytics vs. app queries)

---

## Testing

### Running Tests

```bash
# Run all observability tests
pnpm test tests/observability/

# Run cost guard tests
pnpm test tests/cost-guard/

# Run specific test file
pnpm test tests/cost-guard/middleware.spec.ts
```

### Test Coverage

Tests include:
- ✅ Budget enforcement with high-cost operations
- ✅ Rate limiting scenarios
- ✅ Burst query handling
- ✅ Error message clarity
- ✅ Metrics emission verification
- ✅ Tracing span validation
- ✅ Performance targets (p95 < 1.5s)

### Writing Tests

```typescript
import { costGuard, withCostGuard } from '@/cost-guard';

describe('My Service', () => {
  beforeEach(() => {
    // Reset cost guard state
    (costGuard as any).tenantUsage.clear();
  });

  test('should enforce budget limits', async () => {
    costGuard.setBudgetLimits('test-tenant', {
      daily: 0.001,
      monthly: 0.01,
    });

    await expect(
      withCostGuard({
        tenantId: 'test-tenant',
        userId: 'user-1',
        operation: 'cypher_query',
        complexity: 100,
      }, async () => 'result')
    ).rejects.toThrow(CostGuardError);
  });
});
```

---

## Performance Targets

### SLOs

| Metric | Target | Notes |
|--------|--------|-------|
| p95 graph query latency | < 1.5s | For typical workloads |
| p99 HTTP request latency | < 2.0s | Excluding long exports |
| Tracing overhead | < 5ms | Per operation |
| Metrics overhead | < 2ms | Per metric record |
| Cost guard overhead | < 10ms | Budget check |

### Monitoring SLOs

```typescript
// Track p95 latency
use.recordLatency('graph_query', durationSeconds);

// Alert if p95 exceeds 1.5s
const p95 = await registry.getSingleMetric('latency_p95_seconds');
if (p95.get() > 1.5) {
  alert('SLO violation: p95 latency exceeds 1.5s');
}
```

---

## Troubleshooting

### Common Issues

#### 1. Budget Exceeded Errors

**Symptom**: Users receiving 429 errors

```
Cost Limit Exceeded: Insufficient budget
```

**Solution**:
- Check current budget utilization: `costGuard.getCostAnalysis('tenant-id')`
- Increase budget limits: `costGuard.setBudgetLimits('tenant-id', { daily: 20.0 })`
- Optimize query complexity
- Review query patterns in cost breakdown

#### 2. High Latency

**Symptom**: p95 > 1.5s

**Solution**:
- Check USE metrics for saturation (queue depth)
- Monitor connection pool utilization
- Investigate slow queries in tracing UI
- Consider query optimization or caching

#### 3. Missing Traces

**Symptom**: No traces appearing in Jaeger

**Solution**:
- Verify `OTEL_ENABLED=true`
- Check Jaeger endpoint: `JAEGER_ENDPOINT=http://localhost:14268/api/traces`
- Verify tracer initialization: `tracer.getConfig()`
- Check sampling rate: `OTEL_SAMPLE_RATE=1.0` (for debugging)

#### 4. Metrics Not Exposed

**Symptom**: `/metrics` endpoint returns empty

**Solution**:
- Ensure metrics are being recorded
- Verify registry is passed to `createStandardMetrics()`
- Check endpoint configuration: `app.get('/metrics', ...)`

### Debug Mode

```typescript
// Enable debug logging
import pino from 'pino';

const logger = pino({ level: 'debug', name: 'observability' });

// Check tracer health
console.log(tracer.getConfig());
console.log(tracer.getHealth());

// Check cost guard state
const usage = costGuard.getCurrentUsage('tenant-id');
console.log('Current usage:', usage);
```

---

## Migration Guide

### Migrating Existing Services

#### Step 1: Add Metrics Endpoint

```typescript
import { Registry } from 'prom-client';

const registry = new Registry();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

#### Step 2: Add Cost Guard Middleware

```typescript
import { costGuardMiddleware, costRecordingMiddleware } from '@/cost-guard';

app.use(costGuardMiddleware());
app.use(costRecordingMiddleware());
```

#### Step 3: Configure Budgets

```typescript
import { costGuard } from '@/cost-guard';

// Set budgets for each tenant
costGuard.setBudgetLimits('tenant-1', { daily: 10.0, monthly: 250.0 });
```

#### Step 4: Wrap Expensive Operations (Optional)

```typescript
import { withCostGuard } from '@/cost-guard';

// Only wrap operations that need budget enforcement
const result = await withCostGuard(context, expensiveOperation);
```

#### Step 5: Deploy and Monitor

- Deploy changes
- Monitor `/metrics` endpoint
- Check budget utilization
- Adjust limits as needed

---

## Best Practices

### 1. Set Appropriate Budgets

- **Free tier**: $1-2/day
- **Paid tier**: $10-20/day
- **Enterprise**: Custom limits
- **Analytics workloads**: Higher limits

### 2. Calculate Complexity Accurately

```typescript
function calculateComplexity(query: GraphQLQuery): number {
  let complexity = 1;

  // Adjust for depth
  complexity *= query.depth;

  // Adjust for breadth
  complexity *= query.fieldCount / 10;

  // Adjust for result set size
  if (query.limit > 100) complexity *= 2;

  return Math.floor(complexity);
}
```

### 3. Monitor Key Metrics

- Budget utilization per tenant
- p95/p99 latency
- Error rates
- Connection pool utilization

### 4. Use Tracing for Debugging

- Enable tracing in development
- Lower sampling rate in production (0.1)
- Use trace IDs in logs for correlation

### 5. Test with Realistic Loads

```typescript
// Simulate high-cost burst
const operations = Array.from({ length: 100 }, () =>
  withCostGuard(context, expensiveOperation)
);

const results = await Promise.allSettled(operations);
```

---

## Support

For questions or issues:
1. Check this documentation
2. Review example integrations
3. Check test files for usage patterns
4. File an issue in the repository

---

## Changelog

### v1.0.0 (2025-01-20)

Initial release:
- OpenTelemetry tracing module
- RED/USE metrics helpers
- Cost guard middleware
- GraphQL and database examples
- Comprehensive test suite
- Documentation

---

## License

Internal IntelGraph infrastructure module.
