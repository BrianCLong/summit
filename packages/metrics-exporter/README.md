# @intelgraph/metrics-exporter

Prometheus metrics exporter for IntelGraph services, providing golden signals (latency, traffic, errors, saturation) and business metrics.

## Installation

```bash
pnpm add @intelgraph/metrics-exporter
```

## Usage

### Basic Setup

```typescript
import { MetricsExporter, createMetricsMiddleware, createMetricsEndpoint } from '@intelgraph/metrics-exporter';
import express from 'express';

const app = express();

// Create metrics exporter
const metrics = new MetricsExporter({
  serviceName: 'api-server',
  environment: process.env.NODE_ENV || 'development',
  enableDefaultMetrics: true,
});

// Add automatic HTTP metrics middleware
app.use(createMetricsMiddleware(metrics));

// Expose /metrics endpoint for Prometheus
app.get('/metrics', createMetricsEndpoint(metrics));

// Your routes...
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(4000);
```

### Recording Custom Metrics

#### GraphQL Requests

```typescript
const startTime = Date.now();
try {
  const result = await executeGraphQL(query);
  const duration = (Date.now() - startTime) / 1000;

  metrics.recordGraphQLRequest(
    'getEntity',
    'query',
    duration,
    true
  );
} catch (error) {
  const duration = (Date.now() - startTime) / 1000;
  metrics.recordGraphQLRequest(
    'getEntity',
    'query',
    duration,
    false,
    'INTERNAL_ERROR'
  );
}
```

#### Database Queries

```typescript
const startTime = Date.now();
try {
  const result = await neo4j.run(cypher, params);
  const duration = (Date.now() - startTime) / 1000;

  metrics.recordDatabaseQuery({
    database: 'neo4j',
    operation: 'query',
    duration,
    resultCount: result.records.length,
    success: true,
  });
} catch (error) {
  const duration = (Date.now() - startTime) / 1000;
  metrics.recordDatabaseQuery({
    database: 'neo4j',
    operation: 'query',
    duration,
    success: false,
  });
}
```

#### Cost Metrics

```typescript
// Record cost incurred
metrics.recordCost({
  tenantId: 'tenant-123',
  operation: 'graph_query',
  cost: 0.05, // $0.05
  resourceType: 'compute',
});

// Update budget utilization
metrics.updateBudgetUtilization('tenant-123', 'daily', 75.5); // 75.5%

// Record budget violation
metrics.recordBudgetViolation('tenant-123', 'daily_limit_exceeded');

// Record slow query kill
metrics.recordSlowQueryKill('neo4j', 'tenant-123');
```

#### Business Metrics

```typescript
// Entity created
metrics.recordEntityCreated('tenant-123', 'Person');

// Relationship created
metrics.recordRelationshipCreated('tenant-123', 'WORKS_AT');

// Investigation created
metrics.recordInvestigationCreated('tenant-123');

// Copilot request
metrics.recordCopilotRequest('tenant-123', 'summarize_investigation');
```

## Available Metrics

### Golden Signals

#### Latency
- `intelgraph_http_request_duration_seconds` - HTTP request duration histogram
- `intelgraph_graphql_request_duration_seconds` - GraphQL request duration histogram
- `intelgraph_database_query_duration_seconds` - Database query duration histogram

#### Traffic
- `intelgraph_http_requests_total` - Total HTTP requests counter
- `intelgraph_graphql_requests_total` - Total GraphQL requests counter
- `intelgraph_active_connections` - Active connections gauge

#### Errors
- `intelgraph_http_errors_total` - Total HTTP errors counter
- `intelgraph_graphql_errors_total` - Total GraphQL errors counter
- `intelgraph_database_errors_total` - Total database errors counter

#### Saturation
- `intelgraph_cpu_usage_percent` - CPU usage gauge
- `intelgraph_memory_usage_bytes` - Memory usage gauge
- `intelgraph_database_connection_pool` - Database connection pool gauge

### Cost & Budget Metrics
- `intelgraph_cost_total_dollars` - Total cost counter
- `intelgraph_budget_utilization_percent` - Budget utilization gauge
- `intelgraph_budget_violations_total` - Budget violations counter
- `intelgraph_slow_queries_killed_total` - Slow queries killed counter

### Business Metrics
- `intelgraph_entities_created_total` - Entities created counter
- `intelgraph_relationships_created_total` - Relationships created counter
- `intelgraph_investigations_created_total` - Investigations created counter
- `intelgraph_copilot_requests_total` - Copilot requests counter

## Prometheus Configuration

Add this to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'intelgraph-services'
    scrape_interval: 30s
    static_configs:
      - targets:
          - 'api-server:4000'
          - 'graph-api:4001'
          - 'copilot:4002'
    metrics_path: '/metrics'
```

## Grafana Dashboards

Example queries for dashboards:

### Request Rate
```promql
rate(intelgraph_http_requests_total{service="api-server"}[5m])
```

### Error Rate
```promql
rate(intelgraph_http_errors_total{service="api-server"}[5m])
```

### P95 Latency
```promql
histogram_quantile(0.95, rate(intelgraph_http_request_duration_seconds_bucket{service="api-server"}[5m]))
```

### Budget Utilization
```promql
intelgraph_budget_utilization_percent{tenant_id="tenant-123", period="daily"}
```

### Cost by Tenant
```promql
sum by (tenant_id) (rate(intelgraph_cost_total_dollars[1d]))
```

## Testing

```typescript
import { MetricsExporter } from '@intelgraph/metrics-exporter';

describe('MetricsExporter', () => {
  let metrics: MetricsExporter;

  beforeEach(() => {
    metrics = new MetricsExporter({
      serviceName: 'test-service',
      enableDefaultMetrics: false,
    });
  });

  afterEach(() => {
    metrics.reset();
  });

  it('should record HTTP request', async () => {
    metrics.recordHttpRequest({
      method: 'GET',
      route: '/api/test',
      statusCode: 200,
      duration: 0.5,
      success: true,
    });

    const metricsOutput = await metrics.getMetrics();
    expect(metricsOutput).toContain('intelgraph_http_requests_total');
  });
});
```

## License

MIT
