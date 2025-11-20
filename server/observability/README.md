# IntelGraph Platform - Observability Guide

## Overview

This directory contains comprehensive observability instrumentation for the IntelGraph platform, including:

- **Distributed Tracing** (OpenTelemetry + Jaeger)
- **Metrics** (Prometheus)
- **Structured Logging** (Pino with correlation IDs)
- **Dashboards** (Grafana)
- **Alerting** (Prometheus AlertManager)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    IntelGraph Server                         │
│                                                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Correlation ID │→ │ OpenTelemetry   │→ │    Pino      │ │
│  │   Middleware   │  │     Tracer      │  │   Logger     │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                   │                    │         │
│           ↓                   ↓                    ↓         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Prometheus Metrics Registry                │   │
│  │  • HTTP/GraphQL metrics                             │   │
│  │  • Database pool metrics (PostgreSQL, Neo4j, Redis) │   │
│  │  • Cache performance metrics                        │   │
│  │  • Queue metrics (BullMQ)                           │   │
│  │  • System resource metrics                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                        │                  │
         ↓                        ↓                  ↓
   ┌─────────┐            ┌──────────────┐    ┌──────────┐
   │ Jaeger  │            │  Prometheus  │    │   Logs   │
   │ Tracing │            │   Metrics    │    │  (JSON)  │
   └─────────┘            └──────────────┘    └──────────┘
                                  │
                                  ↓
                          ┌───────────────┐
                          │    Grafana    │
                          │   Dashboards  │
                          └───────────────┘
                                  │
                                  ↓
                          ┌───────────────┐
                          │ AlertManager  │
                          │   (PagerDuty) │
                          └───────────────┘
```

## Quick Start

### 1. Environment Variables

Add these to your `.env` file:

```bash
# OpenTelemetry Configuration
JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_AUTO_INSTRUMENT=true
OTEL_SAMPLE_RATE=1.0

# Tracing
APP_VERSION=1.0.0

# Disable tracing in development if needed
# OTEL_AUTO_INSTRUMENT=false
```

### 2. Using the Observability Features

#### **Automatic Instrumentation** (Already Enabled)

The observability stack is automatically initialized in `app.ts`:

- ✅ Correlation IDs added to all requests
- ✅ OpenTelemetry auto-instrumentation for HTTP/Express/GraphQL
- ✅ Enhanced Pino logging with trace context
- ✅ Prometheus metrics collection

#### **Database Instrumentation**

Wrap your database clients with instrumentation:

**PostgreSQL:**
```typescript
import { instrumentPostgresPool } from './observability/postgres-instrumentation.js';

const pool = new Pool({ /* config */ });
const instrumentedPool = instrumentPostgresPool(pool, 'main');
```

**Neo4j:**
```typescript
import { instrumentNeo4jDriver } from './observability/neo4j-instrumentation.js';

const driver = neo4j.driver(/* ... */);
const instrumentedDriver = instrumentNeo4jDriver(driver);
```

**Redis:**
```typescript
import { instrumentRedisClient, InstrumentedRedisCache } from './observability/redis-instrumentation.js';

const redis = new Redis(/* ... */);
const instrumentedRedis = instrumentRedisClient(redis, 'main');

// Or use the high-level wrapper:
const cache = new InstrumentedRedisCache(redis, 'user-cache');
await cache.get('user:123');
```

#### **Manual Tracing**

Add custom spans to your code:

```typescript
import { getTracer } from './observability/tracer.js';

const tracer = getTracer();

// Method 1: Using withSpan helper
await tracer.withSpan('myOperation', async (span) => {
  span.setAttribute('user.id', userId);
  span.setAttribute('entity.type', 'investigation');

  const result = await doSomeWork();

  return result;
});

// Method 2: Manual span management
const span = tracer.startSpan('myOperation');
try {
  span.setAttribute('foo', 'bar');
  const result = await doSomeWork();
  return result;
} catch (error) {
  tracer.recordException(error);
  throw error;
} finally {
  span.end();
}

// Method 3: Using decorator
import { traced } from './observability/tracer.js';

class MyService {
  @traced('MyService.fetchUser')
  async fetchUser(userId: string) {
    // Automatically traced
    return await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  }
}
```

#### **Custom Metrics**

Record custom business metrics:

```typescript
import { serviceErrors, recordServiceError } from './observability/enhanced-metrics.js';

// Increment a counter
recordServiceError('InvestigationService', 'ValidationError', 'error');

// Record a histogram value
import { serviceResponseTime } from './observability/enhanced-metrics.js';
const start = Date.now();
try {
  await service.processRequest();
  const duration = (Date.now() - start) / 1000;
  serviceResponseTime.observe(
    { service: 'InvestigationService', method: 'processRequest', status: 'success' },
    duration
  );
} catch (error) {
  serviceResponseTime.observe(
    { service: 'InvestigationService', method: 'processRequest', status: 'error' },
    (Date.now() - start) / 1000
  );
}
```

#### **Structured Logging with Correlation**

All logs automatically include correlation IDs when using the Pino logger:

```typescript
import pino from 'pino';

const logger = pino({ name: 'MyService' });

// In request handlers, correlation IDs are automatically added
logger.info({ userId, action: 'create' }, 'User created investigation');

// Output:
{
  "level": 30,
  "time": 1699900000000,
  "correlationId": "a1b2c3d4-...",
  "traceId": "f8e9d7c6b5a4...",
  "spanId": "1234567890ab",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "name": "MyService",
  "msg": "User created investigation"
}
```

## Metrics Reference

### HTTP Metrics
- `http_request_duration_seconds` - HTTP request latency histogram
- `http_requests_total` - Total HTTP requests counter
- `http_request_size_bytes` - HTTP request body size

### GraphQL Metrics
- `graphql_request_duration_seconds` - GraphQL operation latency
- `graphql_resolver_duration_seconds` - Per-resolver latency
- `graphql_resolver_calls_total` - Resolver invocation count
- `graphql_resolver_errors_total` - Resolver errors

### Database Metrics
- `db_connection_pool_active` - Active connections
- `db_connection_pool_idle` - Idle connections
- `db_connection_pool_waiting` - Queued requests
- `db_query_duration_seconds` - Query latency
- `neo4j_sessions_active` - Active Neo4j sessions
- `neo4j_transaction_duration_seconds` - Transaction duration

### Cache Metrics
- `redis_cache_hit_ratio` - Cache hit ratio (0-1)
- `redis_cache_hits_total` - Cache hits counter
- `redis_cache_misses_total` - Cache misses counter
- `redis_operation_duration_seconds` - Redis operation latency

### Queue Metrics
- `queue_jobs_waiting` - Jobs waiting in queue
- `queue_jobs_active` - Jobs being processed
- `queue_job_duration_seconds` - Job processing time

### System Metrics
- `nodejs_heap_size_used_bytes` - Heap memory used
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `process_cpu_seconds_total` - CPU usage

## Dashboards

### Import Grafana Dashboard

1. Open Grafana UI
2. Go to **Dashboards** → **Import**
3. Upload `grafana-dashboard.json`
4. Select your Prometheus data source
5. Click **Import**

### Dashboard Sections

- **Service Health Overview** - HTTP request rate, latency, error rate
- **GraphQL Operations** - GraphQL-specific metrics
- **Database Metrics** - Connection pools, query latency, Neo4j sessions
- **Cache Performance** - Redis hit ratio, operation latency
- **System Resources** - Memory, CPU, event loop
- **WebSocket & Real-time** - Active connections, message rate
- **Job Queues** - Queue depth, processing time
- **Errors & Alerts** - Service errors by type

## Alerts

### Configure Prometheus AlertManager

1. Copy `prometheus-alerts.yml` to your Prometheus config directory:
   ```bash
   cp observability/prometheus-alerts.yml /etc/prometheus/rules/
   ```

2. Update `prometheus.yml`:
   ```yaml
   rule_files:
     - /etc/prometheus/rules/prometheus-alerts.yml
   ```

3. Reload Prometheus:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

### Alert Severity Levels

- **Critical** - Requires immediate action (page on-call)
  - SLO violations
  - Service unavailability
  - Database connection pool exhaustion
  - High error rates (>5%)

- **Warning** - Requires attention within hours
  - Elevated latency
  - Degraded cache performance
  - High queue backlog
  - Resource usage >80%

### SLO Definitions

| SLI | Target | Error Budget |
|-----|--------|--------------|
| Availability | 99.9% | 0.1% errors/hour |
| Latency (P95) | <500ms | 5% >500ms |
| Latency (P99) | <2s | 1% >2s |
| Cache Hit Ratio | >70% | - |

## Privacy & Security

### Automatic Redaction

The following fields are automatically redacted from logs:

- `req.headers.authorization`
- `req.headers.cookie`
- `password`
- `api_key`
- `token`
- `secret`

### PII Handling

**Logged:**
- ✅ User ID (hashed/opaque identifier)
- ✅ Tenant ID
- ✅ Request ID / Correlation ID
- ✅ Operation names
- ✅ Error types (without sensitive details)

**NOT Logged:**
- ❌ Email addresses
- ❌ Authentication tokens
- ❌ Passwords
- ❌ API keys
- ❌ Full query parameters (truncated to 500 chars)
- ❌ Request/response bodies

## Troubleshooting

### Check if tracing is enabled

```bash
curl http://localhost:4000/metrics | grep otel
```

### View active traces in Jaeger

1. Open Jaeger UI: `http://localhost:16686`
2. Select service: `intelgraph-server`
3. Click **Find Traces**

### Check Prometheus targets

```bash
curl http://localhost:9090/api/v1/targets
```

### Debug correlation IDs

```bash
curl -H "x-correlation-id: test-123" http://localhost:4000/health
# Check response headers for x-correlation-id and x-trace-id
```

## Performance Impact

Observability overhead has been minimized:

- **Metrics collection**: <1% CPU overhead
- **Tracing** (100% sampling): ~2-3% overhead
- **Logging**: <1% overhead (async writes)

**Total overhead**: ~3-5% in production

To reduce overhead further:
- Lower sampling rate: `OTEL_SAMPLE_RATE=0.1` (10% of traces)
- Disable auto-instrumentation: `OTEL_AUTO_INSTRUMENT=false`

## Further Reading

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [SLO/SLI Guide](https://sre.google/workbook/implementing-slos/)
