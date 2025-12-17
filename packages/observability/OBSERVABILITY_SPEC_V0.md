# CompanyOS Observability Specification v0

> **Version**: 0.1.0
> **Status**: Draft
> **Last Updated**: 2025-12-07
> **Owner**: Platform Engineering / SRE

## Table of Contents

1. [Overview](#overview)
2. [Observability Contract](#observability-contract)
3. [Metrics Standard](#metrics-standard)
4. [Logging Standard](#logging-standard)
5. [Tracing Standard](#tracing-standard)
6. [SLO Framework](#slo-framework)
7. [Health Checks](#health-checks)
8. [Service Archetypes](#service-archetypes)
9. [Dashboard Standards](#dashboard-standards)
10. [Alert Standards](#alert-standards)
11. [Compliance Checklist](#compliance-checklist)
12. [SDK Usage](#sdk-usage)

---

## Overview

### Purpose

This specification defines the observability standards that **all CompanyOS services must implement**. It ensures:

- **Consistency**: Uniform metrics, logs, and traces across all services
- **Debuggability**: Ability to trace requests end-to-end
- **Reliability**: SLO-based operations with error budget tracking
- **Auditability**: Security-relevant events are captured and searchable

### Guiding Principles

1. **Observability by Default**: Services get comprehensive observability "for free" via the SDK
2. **Standard Signals**: All services emit the same base metrics, log schema, and trace attributes
3. **SLO-Driven**: Every service has defined SLOs with burn rate alerting
4. **Trace Everything**: All cross-service calls propagate trace context
5. **Secure Logging**: PII is redacted, audit events are immutable

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Metrics | Prometheus + prom-client | Time-series metrics |
| Logging | Pino + Loki | Structured logs |
| Tracing | OpenTelemetry + Jaeger | Distributed traces |
| Dashboards | Grafana | Visualization |
| Alerting | Prometheus AlertManager | Alert routing |

---

## Observability Contract

Every compliant service must implement this contract:

```typescript
interface ObservabilityContract {
  // Service identification
  service: {
    name: string;           // Unique service name
    version: string;        // Semver version
    environment: string;    // development | staging | production
    team?: string;          // Owning team
    tier?: string;          // critical | standard | background
  };

  // Archetype determines default metrics/SLOs
  archetype: 'api-service' | 'worker-service' | 'gateway-service' |
             'data-pipeline' | 'storage-service' | 'ml-service';

  // Required endpoints
  endpoints: {
    metrics: '/metrics';           // Prometheus scrape endpoint
    health: '/health';             // Liveness probe
    ready: '/health/ready';        // Readiness probe
    detailed: '/health/detailed';  // Detailed health report
  };

  // Required capabilities
  capabilities: {
    structuredLogging: true;
    traceCorrelation: true;
    metricsExport: true;
    healthChecks: true;
  };
}
```

---

## Metrics Standard

### Naming Convention

All metrics must follow this naming pattern:

```
<domain>_<metric>_<unit>
```

Examples:
- `http_requests_total` (counter)
- `http_request_duration_seconds` (histogram)
- `db_connections_active` (gauge)

### Required Labels

Every metric must include these labels:

| Label | Description | Example |
|-------|-------------|---------|
| `service` | Service name | `user-api` |
| `environment` | Deployment env | `production` |
| `version` | Service version | `1.2.3` |

### Standard Metrics by Category

#### HTTP Metrics (Required for API services)

```yaml
- name: http_requests_total
  type: counter
  labels: [service, method, route, status_code]
  description: Total HTTP requests received

- name: http_request_duration_seconds
  type: histogram
  labels: [service, method, route, status_code]
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  description: HTTP request latency distribution

- name: http_requests_in_flight
  type: gauge
  labels: [service, method]
  description: Current in-flight requests
```

#### Database Metrics (Required if using databases)

```yaml
- name: db_queries_total
  type: counter
  labels: [service, db_system, operation, status]
  description: Total database queries

- name: db_query_duration_seconds
  type: histogram
  labels: [service, db_system, operation]
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5]
  description: Database query latency

- name: db_connections_active
  type: gauge
  labels: [service, db_system, pool]
  description: Active database connections
```

#### Queue/Job Metrics (Required for worker services)

```yaml
- name: jobs_processed_total
  type: counter
  labels: [service, queue, job_type, status]
  description: Total jobs processed

- name: job_duration_seconds
  type: histogram
  labels: [service, queue, job_type]
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600]
  description: Job processing duration

- name: jobs_in_queue
  type: gauge
  labels: [service, queue, priority]
  description: Jobs waiting in queue
```

#### Error Metrics (Required for ALL services)

```yaml
- name: errors_total
  type: counter
  labels: [service, error_type, severity]
  description: Total errors by type and severity
```

### Histogram Bucket Guidelines

| Operation Type | Recommended Buckets (seconds) |
|----------------|------------------------------|
| HTTP requests | 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10 |
| Database queries | 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5 |
| Background jobs | 0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600 |
| Cache operations | 0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1 |
| External APIs | 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30 |
| ML inference | 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60 |

---

## Logging Standard

### Log Schema

All logs must be structured JSON with this schema:

```typescript
interface LogEntry {
  // Required fields
  timestamp: string;      // ISO 8601 format
  level: string;          // TRACE | DEBUG | INFO | WARN | ERROR | FATAL
  message: string;        // Human-readable message
  service: string;        // Service name
  environment: string;    // Deployment environment
  version: string;        // Service version

  // Trace correlation (required when available)
  traceId?: string;       // OpenTelemetry trace ID
  spanId?: string;        // OpenTelemetry span ID

  // Request context (when applicable)
  requestId?: string;     // Unique request identifier
  userId?: string;        // Authenticated user ID
  tenantId?: string;      // Tenant ID (multi-tenant)

  // Error details (when level is ERROR or FATAL)
  error?: {
    name: string;
    message: string;
    stack?: string;
  };

  // Performance (when applicable)
  duration_ms?: number;

  // Additional context
  [key: string]: unknown;
}
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| TRACE | Detailed debugging | Function entry/exit |
| DEBUG | Development debugging | Variable values |
| INFO | Normal operations | Request completed |
| WARN | Potential issues | Retry attempt |
| ERROR | Errors (recoverable) | Failed external call |
| FATAL | Critical failures | Cannot start service |

### Production Log Levels

| Environment | Minimum Level |
|-------------|---------------|
| Development | DEBUG |
| Staging | INFO |
| Production | INFO |

### PII Redaction

The following fields are automatically redacted:

```typescript
const REDACTED_FIELDS = [
  'password', 'token', 'secret', 'apiKey', 'api_key',
  'authorization', 'cookie', 'sessionId', 'session_id',
  'creditCard', 'credit_card', 'ssn', 'privateKey', 'private_key',
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
];
```

### Audit Log Requirements

Security-relevant events must be logged as audit events:

```typescript
interface AuditEvent {
  type: 'auth' | 'access' | 'mutation' | 'admin' | 'security';
  action: string;
  actor: { type: string; id: string; ip?: string };
  resource: { type: string; id: string };
  outcome: 'success' | 'failure' | 'denied';
  timestamp: string;
  context: { traceId?: string; requestId?: string; tenantId?: string };
}
```

---

## Tracing Standard

### Trace Context Propagation

All services must:
1. Extract trace context from incoming requests
2. Propagate context to downstream services
3. Create spans for significant operations

### Supported Propagators

- **W3C Trace Context** (required)
- B3 (optional, for legacy systems)
- Jaeger (optional)

### Span Naming Convention

| Operation Type | Naming Pattern | Example |
|----------------|----------------|---------|
| HTTP Server | `HTTP {method} {route}` | `HTTP GET /api/users` |
| HTTP Client | `HTTP {method}` | `HTTP POST` |
| Database | `{db_system} {operation}` | `postgresql SELECT` |
| Queue | `{queue} {operation}` | `orders publish` |
| GraphQL | `graphql.{type}` | `graphql.query` |

### Required Span Attributes

#### HTTP Spans

```yaml
http.method: GET
http.url: /api/users/123
http.route: /api/users/:id
http.status_code: 200
http.request_content_length: 0
http.response_content_length: 256
```

#### Database Spans

```yaml
db.system: postgresql
db.operation: SELECT
db.statement: SELECT * FROM users WHERE id = $1  # Optional, may contain PII
```

#### Messaging Spans

```yaml
messaging.system: kafka
messaging.destination: orders
messaging.operation: publish
```

---

## SLO Framework

### Default SLO Targets by Archetype

| Archetype | Availability | Latency P99 | Latency P95 |
|-----------|--------------|-------------|-------------|
| api-service | 99.9% | 500ms | 200ms |
| gateway-service | 99.95% | 100ms | 50ms |
| worker-service | 99.5% | 5min | 1min |
| data-pipeline | 99.0% | 10min | 5min |
| storage-service | 99.99% | 100ms | 50ms |
| ml-service | 99.5% | 5s | 2s |

### Error Budget Calculation

```
Error Budget = 100% - SLO Target

Example: 99.9% SLO = 0.1% error budget = 43.8 minutes/month downtime
```

### Multi-Window Burn Rate Alerts

| Severity | Long Window | Short Window | Burn Rate | Action |
|----------|-------------|--------------|-----------|--------|
| Critical | 1h | 5m | 14.4x | Page immediately |
| High | 6h | 30m | 6x | Page (business hours) |
| Medium | 3d | 6h | 1x | Create ticket |
| Low | 7d | 1d | 0.5x | Review weekly |

### SLI Definitions

#### Availability SLI

```promql
sum(rate(http_requests_total{service="$service",status_code!~"5.."}[5m]))
/
sum(rate(http_requests_total{service="$service"}[5m]))
```

#### Latency SLI (P99 < threshold)

```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="$service"}[5m]))
  by (le)
) < $threshold_seconds
```

---

## Health Checks

### Required Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Liveness probe | `{ "status": "ok" }` |
| `/health/live` | Kubernetes liveness | `{ "status": "ok" }` |
| `/health/ready` | Kubernetes readiness | Full health report |
| `/health/detailed` | Detailed diagnostics | Full health + dependencies |

### Health Report Schema

```typescript
interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime_seconds: number;
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency_ms?: number;
    message?: string;
  }>;
}
```

### Required Health Checks

| Archetype | Required Checks |
|-----------|-----------------|
| api-service | database, cache (if used) |
| worker-service | database, queue |
| gateway-service | downstream services |
| data-pipeline | database, queue, storage |
| storage-service | database |
| ml-service | model availability |

---

## Service Archetypes

### api-service

HTTP/GraphQL APIs serving synchronous requests.

**Required Metrics:**
- `http_requests_total`
- `http_request_duration_seconds`
- `graphql_operations_total` (if GraphQL)
- `graphql_operation_duration_seconds` (if GraphQL)
- `db_queries_total`
- `db_query_duration_seconds`

**Default SLOs:**
- Availability: 99.9%
- Latency P99: 500ms

### worker-service

Background job processors.

**Required Metrics:**
- `jobs_processed_total`
- `job_duration_seconds`
- `jobs_in_queue`
- `jobs_in_progress`

**Default SLOs:**
- Job Success Rate: 99.5%
- Job Duration P99: 5 minutes

### gateway-service

API gateways, load balancers.

**Required Metrics:**
- `http_requests_total`
- `http_request_duration_seconds`
- `http_requests_in_flight`
- `external_requests_total`
- `external_request_duration_seconds`

**Default SLOs:**
- Availability: 99.95%
- Latency P99: 100ms

### data-pipeline

ETL and streaming processors.

**Required Metrics:**
- `jobs_processed_total`
- `job_duration_seconds`
- `business_events_total`

**Default SLOs:**
- Success Rate: 99.0%
- Processing Time P99: 10 minutes

### storage-service

Database proxies, caches.

**Required Metrics:**
- `db_queries_total`
- `db_query_duration_seconds`
- `db_connections_active`
- `cache_operations_total` (if cache)

**Default SLOs:**
- Availability: 99.99%
- Latency P99: 100ms

### ml-service

ML inference services.

**Required Metrics:**
- `ml_inference_total`
- `ml_inference_duration_seconds`
- `ml_model_load_time_seconds`

**Default SLOs:**
- Availability: 99.5%
- Inference Latency P99: 5 seconds

---

## Dashboard Standards

### Golden Signals Dashboard

Every service must have a dashboard with these panels:

1. **Traffic** - Request rate over time
2. **Errors** - Error rate and types
3. **Latency** - P50, P95, P99 latencies
4. **Saturation** - Resource utilization

### SLO Dashboard

Every service must have an SLO dashboard with:

1. **SLI Value** - Current SLI as percentage
2. **Error Budget** - Remaining budget
3. **Burn Rate** - Current burn rate
4. **Error Budget Timeline** - Budget consumption over time

### Panel Requirements

- All panels must use consistent colors
- Time range must be configurable
- Service/environment must be selectable
- Include alert thresholds as annotations

---

## Alert Standards

### Alert Naming

```
<Service>_<Category>_<Severity>
```

Examples:
- `UserAPI_Availability_Critical`
- `OrderWorker_QueueDepth_Warning`

### Required Annotations

```yaml
annotations:
  summary: "Brief description"
  description: "Detailed description with current value"
  runbook_url: "https://runbooks.companyos.dev/..."
  dashboard_url: "https://grafana.companyos.dev/..."
```

### Alert Routing

| Severity | Routing |
|----------|---------|
| Critical | PagerDuty (immediate) |
| Warning | Slack + PagerDuty (business hours) |
| Info | Slack only |

---

## Compliance Checklist

Use this checklist when onboarding a new service:

### Metrics
- [ ] Service emits all required metrics for its archetype
- [ ] Metrics include standard labels (service, environment, version)
- [ ] `/metrics` endpoint returns Prometheus format
- [ ] Histogram buckets are appropriate for operation types

### Logging
- [ ] All logs are structured JSON
- [ ] Log schema matches specification
- [ ] Trace IDs are included when available
- [ ] PII is redacted
- [ ] Audit events are logged for security-relevant operations

### Tracing
- [ ] OpenTelemetry SDK is initialized
- [ ] Trace context is extracted from incoming requests
- [ ] Trace context is propagated to downstream calls
- [ ] Spans are created for significant operations
- [ ] Span attributes follow naming conventions

### Health Checks
- [ ] `/health` endpoint returns liveness status
- [ ] `/health/ready` endpoint checks dependencies
- [ ] `/health/detailed` endpoint returns full report
- [ ] Health checks have appropriate timeouts

### SLOs
- [ ] Availability SLO is defined
- [ ] Latency SLO is defined (if applicable)
- [ ] Prometheus recording rules are deployed
- [ ] Burn rate alerts are configured

### Dashboards
- [ ] Golden signals dashboard exists
- [ ] SLO dashboard exists
- [ ] Dashboards are provisioned in Grafana

### Alerts
- [ ] SLO burn rate alerts are configured
- [ ] Alerts have runbook URLs
- [ ] Alerts are routed appropriately

---

## SDK Usage

### Installation

```bash
pnpm add @companyos/observability
```

### Quick Start

```typescript
import {
  initializeObservability,
  createLogger,
  setupObservability,
} from '@companyos/observability';
import express from 'express';

const app = express();

// Service configuration
const serviceConfig = {
  name: 'my-service',
  version: '1.0.0',
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  team: 'platform',
  tier: 'standard' as const,
};

// Initialize observability
await initializeObservability({
  service: serviceConfig,
  archetype: 'api-service',
});

// Setup Express middleware
const middleware = setupObservability(app, { service: serviceConfig });

// Create logger
const logger = createLogger({ service: serviceConfig });

// Your routes here
app.get('/api/users', async (req, res) => {
  (req as any).log.info('Fetching users');
  // ...
});

// Error handling (must be last)
app.use(middleware.errorHandler);

app.listen(3000);
```

### Manual Instrumentation

```typescript
import {
  withSpan,
  recordDbQuery,
  recordCacheOperation,
} from '@companyos/observability';

// Wrap operations in spans
const result = await withSpan('fetchUser', async (span) => {
  span.setAttribute('user.id', userId);

  // Record database query
  const start = Date.now();
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  recordDbQuery('postgresql', 'SELECT', (Date.now() - start) / 1000, true, 'my-service');

  return user;
});
```

---

## Appendix

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level | `info` |
| `OTEL_ENABLED` | Enable tracing | `true` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint | `http://localhost:4318` |
| `OTEL_SAMPLE_RATE` | Trace sample rate | `1.0` |
| `PROMETHEUS_ENABLED` | Enable metrics | `true` |

### References

- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [The RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [The USE Method](https://www.brendangregg.com/usemethod.html)

---

**Document Changelog:**

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-12-07 | Initial draft |
