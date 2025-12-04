# GraphQL Gateway Observability Guide

## Overview

The GraphQL Gateway now includes comprehensive observability instrumentation using OpenTelemetry, Prometheus, and structured logging.

## Architecture

```
GraphQL Request
     ↓
[OpenTelemetry Auto-instrumentation]
     ↓
[metricsPlugin] → Prometheus Metrics → Prometheus → Grafana
     ↓
[Structured Logger] → JSON Logs → Loki → Grafana
     ↓
[Trace Spans] → OTLP Collector → Jaeger/Tempo → Grafana
```

## Metrics Collected

### GraphQL Operation Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `graphql_query_duration_ms` | Histogram | operation, operationType, status | Query execution duration |
| `graphql_requests_total` | Counter | operation, operationType, status | Total requests |
| `graphql_errors_total` | Counter | operation, errorType, errorCode | Total errors |
| `graphql_query_complexity` | UpDownCounter | operation | Query complexity score |
| `graphql_cache_hits_total` | Counter | operation | Cache hits |
| `graphql_cache_misses_total` | Counter | operation | Cache misses |

### Golden Path SLO Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `golden_path_success_total` | Counter | step | Successful golden path steps |
| `golden_path_duration_ms` | Histogram | step | Step duration |
| `golden_path_errors_total` | Counter | step, errorType | Step errors |

**Golden Path Steps:**
- `create_investigation`
- `add_entity`
- `add_relationship`
- `copilot_query`
- `view_results`

## Distributed Tracing

### Trace Spans

1. **`graphql.query`** (root span)
   - Attributes: `graphql.operation.name`, `graphql.operation.type`
   - Duration: Full request lifecycle

2. **`graphql.resolve.{type}.{field}`** (resolver spans)
   - Attributes: `graphql.field.path`, `graphql.field.type`, `graphql.field.name`
   - Duration: Individual resolver execution

3. **`db.neo4j.query`** / **`db.postgres.query`** (database spans)
   - Attributes: `db.statement`, `db.operation`
   - Automatically instrumented via OpenTelemetry

### Trace Context Propagation

Trace context is propagated via W3C Trace Context headers:
- `traceparent: 00-{trace-id}-{span-id}-01`
- `tracestate: {vendor-specific-state}`

All outbound HTTP calls include these headers for distributed tracing.

## Structured Logging

### Log Format (JSON)

```json
{
  "timestamp": "2025-11-28T10:30:45.123Z",
  "level": "info",
  "service": "graphql-gateway",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "operation": "createEntity",
  "userId": "hash_abc123",
  "investigationId": "inv_xyz789",
  "duration_ms": 245,
  "status": "success",
  "message": "Entity created successfully"
}
```

### Privacy & PII Protection

- **User IDs**: Hashed with SHA-256 (prefix: `hash_`)
- **Passwords, secrets, tokens**: Automatically removed
- **Investigation/Entity IDs**: Logged as-is (business identifiers, not PII)

### Usage Example

```typescript
import { logger } from './logger';

// Simple logging
logger.info('Processing GraphQL query', { operation: 'getEntities' });

// Error logging with exception
try {
  await processQuery();
} catch (error) {
  logger.error('Query processing failed', error, { operation: 'getEntities' });
}

// Measure operation duration
const result = await logger.measure('fetchFromNeo4j', async () => {
  return await neo4jClient.query(cypher);
}, { queryType: 'entity_search' });
```

## Alerts

### Severe (Sev-1)

| Alert | Condition | Duration | Runbook |
|-------|-----------|----------|---------|
| GraphQLHighLatency | p95 > 2s | 5m | [Link](../../RUNBOOKS/graphql-high-latency.md) |
| GraphQLHighErrorRate | Error rate > 5% | 5m | [Link](../../RUNBOOKS/graphql-high-error-rate.md) |
| GoldenPathBroken | Success < 95% | 10m | [Link](../../RUNBOOKS/golden-path-failure.md) |
| GraphQLGatewayDown | Service down | 1m | [Link](../../RUNBOOKS/service-down.md) |

### Warning (Sev-2)

| Alert | Condition | Duration |
|-------|-----------|----------|
| GraphQLModerateLatency | p95 > 1s | 10m |
| GraphQLModerateErrorRate | Error rate > 2% | 10m |
| GoldenPathDegraded | Success < 98% | 15m |
| Neo4jSlowQueries | p95 > 500ms | 10m |

## Dashboards

### GraphQL API - Comprehensive Observability
**File**: `observability/grafana/dashboards/graphql-comprehensive.json`

**Panels:**
1. Request Rate (QPS)
2. Error Rate (%)
3. Latency Percentiles (p50, p95, p99)
4. Golden Path Success Rate (gauge)
5. Golden Path Latency by Step
6. Query Complexity
7. Cache Hit Rate
8. Total Requests (5m)
9. Error Count (5m)
10. Active Traces
11. Error Types Breakdown (pie chart)
12. Top 10 Slowest Operations (table)

**Access**: http://localhost:3001/d/graphql-api-comprehensive

## Endpoints

| Endpoint | Port | Purpose |
|----------|------|---------|
| `/metrics` | 9464 | Prometheus metrics scraping |
| `/health` | 4000 | Health check (not traced) |
| `graphql` | 4000 | GraphQL API (fully instrumented) |

## Setup & Configuration

### 1. Install Dependencies

```bash
cd apps/gateway
pnpm add @opentelemetry/sdk-node \
         @opentelemetry/auto-instrumentations-node \
         @opentelemetry/exporter-trace-otlp-http \
         @opentelemetry/exporter-metrics-otlp-http \
         @opentelemetry/sdk-metrics \
         @opentelemetry/resources \
         @opentelemetry/semantic-conventions \
         @opentelemetry/exporter-prometheus \
         @opentelemetry/api
```

### 2. Environment Variables

```bash
# OTLP Collector endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Service metadata
SERVICE_VERSION=1.0.0
NODE_ENV=production
```

### 3. Start Observability Stack

```bash
# Start full observability stack
docker-compose -f docker-compose.observability.yml up -d

# Verify services
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana (admin/admin)
curl http://localhost:16686 # Jaeger UI
```

### 4. Update Prometheus Scrape Config

Add to `observability/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'graphql-gateway'
    static_configs:
      - targets: ['graphql-gateway:9464']
    scrape_interval: 15s
```

### 5. Verify Metrics

```bash
# Check Prometheus metrics endpoint
curl http://localhost:9464/metrics

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=graphql_requests_total'

# View traces in Jaeger
open http://localhost:16686
```

## SLO Tracking

### Availability SLO

**Target**: 99.5% success rate for golden path
**Error Budget**: 0.5% (216 minutes/month)

**Calculation**:
```promql
(
  sum(rate(golden_path_success_total[30d]))
  /
  (sum(rate(golden_path_success_total[30d])) + sum(rate(golden_path_errors_total[30d])))
) * 100
```

### Latency SLO

**Target**: p95 < 1s, p99 < 2s

**Calculation**:
```promql
histogram_quantile(0.95, sum(rate(graphql_query_duration_ms_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(graphql_query_duration_ms_bucket[5m])) by (le))
```

## Troubleshooting

### No Metrics Appearing

1. Check OpenTelemetry SDK started:
   ```bash
   docker logs graphql-gateway | grep "OpenTelemetry initialized"
   ```

2. Verify OTLP collector is reachable:
   ```bash
   curl http://otel-collector:4318/v1/traces
   ```

3. Check Prometheus scrape targets:
   ```
   http://localhost:9090/targets
   ```

### No Traces in Jaeger

1. Verify OTLP exporter endpoint:
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

2. Check OTLP collector logs:
   ```bash
   docker logs otel-collector
   ```

3. Verify Jaeger collector is receiving spans:
   ```bash
   docker logs jaeger-collector
   ```

### High Cardinality Warnings

If you see high cardinality warnings in Prometheus:

1. Review `operation` label values
2. Consider grouping anonymous queries
3. Limit resolver-level metrics to slow resolvers only (> 10ms)

## Next Steps

1. **Create Runbooks**: Document incident response procedures
2. **Set Up Alertmanager**: Configure PagerDuty/Slack integrations
3. **Add Custom SLOs**: Define service-specific SLOs
4. **Enable Exemplars**: Link metrics to traces in Grafana
5. **Add User Journey Tracking**: Instrument client-side telemetry

## References

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
