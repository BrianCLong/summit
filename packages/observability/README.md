# @companyos/observability

Unified observability SDK for CompanyOS services. Provides standardized metrics, logging, tracing, SLO management, and health checks.

## Features

- **Metrics**: RED + USE methodology metrics with Prometheus
- **Logging**: Structured JSON logging with Pino + trace correlation
- **Tracing**: OpenTelemetry distributed tracing
- **SLOs**: Error budget tracking with multi-window burn rate alerts
- **Health Checks**: Kubernetes-ready liveness and readiness probes
- **Middleware**: Express middleware for automatic instrumentation

## Installation

```bash
pnpm add @companyos/observability
```

## Quick Start

```typescript
import express from 'express';
import {
  initializeObservability,
  setupObservability,
  createLogger,
} from '@companyos/observability';

const app = express();

// Service configuration
const serviceConfig = {
  name: 'my-api',
  version: '1.0.0',
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  team: 'platform',
  tier: 'standard' as const,
};

// Initialize all observability systems
await initializeObservability({
  service: serviceConfig,
  archetype: 'api-service',
});

// Setup Express middleware (metrics, tracing, logging, health endpoints)
const middleware = setupObservability(app, { service: serviceConfig });

// Create a logger
const logger = createLogger({ service: serviceConfig });

// Your routes
app.get('/api/users', async (req, res) => {
  (req as any).log.info('Fetching users');
  res.json({ users: [] });
});

// Error handling (must be last)
app.use(middleware.errorHandler);

app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
```

## Service Archetypes

Choose the archetype that best matches your service type:

| Archetype | Description | Default Availability SLO | Default Latency P99 |
|-----------|-------------|-------------------------|---------------------|
| `api-service` | REST/GraphQL APIs | 99.9% | 500ms |
| `gateway-service` | API gateways, load balancers | 99.95% | 100ms |
| `worker-service` | Background job processors | 99.5% | 5 min |
| `data-pipeline` | ETL, streaming processors | 99.0% | 10 min |
| `storage-service` | Database proxies, caches | 99.99% | 100ms |
| `ml-service` | ML inference services | 99.5% | 5s |

## Metrics

### Standard Metrics

All services emit these metrics automatically:

```typescript
// HTTP Metrics
http_requests_total{service, method, route, status_code}
http_request_duration_seconds{service, method, route, status_code}
http_requests_in_flight{service, method}

// Error Metrics
errors_total{service, error_type, severity}

// Database Metrics (when used)
db_queries_total{service, db_system, operation, status}
db_query_duration_seconds{service, db_system, operation}
db_connections_active{service, db_system, pool}

// Cache Metrics (when used)
cache_operations_total{service, cache_name, operation, result}
cache_operation_duration_seconds{service, cache_name, operation}

// Job Metrics (worker services)
jobs_processed_total{service, queue, job_type, status}
job_duration_seconds{service, queue, job_type}
jobs_in_queue{service, queue, priority}
```

### Recording Metrics Manually

```typescript
import {
  recordHttpRequest,
  recordDbQuery,
  recordCacheOperation,
  recordJob,
  recordError,
} from '@companyos/observability';

// Record an HTTP request
recordHttpRequest('GET', '/api/users', 200, 0.045, 'my-service');

// Record a database query
recordDbQuery('postgresql', 'SELECT', 0.012, true, 'my-service');

// Record a cache operation
recordCacheOperation('user-cache', 'get', true, 0.001, 'my-service');

// Record a job completion
recordJob('emails', 'send-welcome', 'completed', 1.5, 'my-service');

// Record an error
recordError('ValidationError', 'medium', 'my-service');
```

## Logging

### Structured Logging

```typescript
import { createLogger, createAuditLogger } from '@companyos/observability';

const logger = createLogger({
  service: serviceConfig,
  level: 'info',
  redactFields: ['customSecret'], // Additional fields to redact
});

// Basic logging
logger.info('User created');
logger.info({ userId: '123', action: 'signup' }, 'User created');
logger.error({ err: error }, 'Failed to process request');

// Audit logging
const auditLogger = createAuditLogger(logger);
auditLogger.logAuth('login', { type: 'user', id: '123', ip: '1.2.3.4' }, 'success');
auditLogger.logMutation('create', { type: 'user', id: '123' }, { type: 'user', id: '456' }, 'success');
```

### Log Schema

All logs follow this schema:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "service": "my-api",
  "environment": "production",
  "version": "1.0.0",
  "traceId": "abc123...",
  "spanId": "def456...",
  "requestId": "req-789",
  "userId": "user-123",
  "duration_ms": 45
}
```

## Tracing

### Automatic Instrumentation

The SDK automatically instruments:
- HTTP requests (incoming and outgoing)
- Database queries (PostgreSQL, Neo4j, Redis)
- GraphQL operations
- Express routes

### Manual Span Creation

```typescript
import {
  withSpan,
  startSpan,
  createDbSpan,
  addSpanAttributes,
  recordException,
} from '@companyos/observability';

// Wrap an async operation
const result = await withSpan('processOrder', async (span) => {
  span.setAttribute('order.id', orderId);

  // Your logic here
  const order = await orderService.process(orderId);

  span.setAttribute('order.total', order.total);
  return order;
});

// Manual span management
const span = startSpan('customOperation', { kind: 'internal' });
try {
  // Your logic
  addSpanAttributes({ 'custom.key': 'value' });
} catch (error) {
  recordException(error as Error);
  throw error;
} finally {
  span.end();
}

// Database operation span
const dbSpan = createDbSpan('postgresql', 'SELECT', 'SELECT * FROM users');
// ... execute query
dbSpan.end();
```

### Context Propagation

```typescript
import { extractContext, injectContext } from '@companyos/observability';

// Extract context from incoming request headers
const parentContext = extractContext(req.headers);

// Inject context into outgoing request headers
const headers = injectContext({});
await fetch('http://other-service/api', { headers });
```

## SLOs

### Generating SLO Configuration

```typescript
import { generateSloConfig, DEFAULT_SLO_TARGETS } from '@companyos/observability';

// Generate SLOs for a service
const { slos, prometheusRules } = generateSloConfig('my-api', 'api-service');

console.log('SLO Definitions:', slos);
console.log('Prometheus Rules:', prometheusRules);
```

### Error Budget Calculation

```typescript
import { calculateErrorBudget, timeToExhaustion } from '@companyos/observability';

const budget = calculateErrorBudget(
  99.9,    // SLO target (%)
  30,      // Window (days)
  99.85,   // Current success rate (%)
  15       // Days elapsed
);

console.log(budget);
// {
//   total: 0.1,
//   remaining: 0.05,
//   consumed: 0.05,
//   windowRemaining: 1296000,
//   burnRate: 1.5,
//   status: 'warning'
// }

const exhaustion = timeToExhaustion(99.9, 30, 1.5);
console.log(exhaustion);
// { hours: 480, humanReadable: '20 days' }
```

## Health Checks

### Registering Health Checks

```typescript
import {
  registerHealthCheck,
  createPostgresHealthCheck,
  createRedisHealthCheck,
  createHttpHealthCheck,
  runHealthChecks,
} from '@companyos/observability';

// Register database health check
registerHealthCheck('postgres', createPostgresHealthCheck(pgPool));

// Register cache health check
registerHealthCheck('redis', createRedisHealthCheck(redisClient));

// Register external service health check
registerHealthCheck(
  'payment-service',
  createHttpHealthCheck('http://payment-service/health', 'payment-service')
);

// Run all health checks
const report = await runHealthChecks();
console.log(report);
// {
//   status: 'healthy',
//   service: 'my-api',
//   version: '1.0.0',
//   uptime_seconds: 3600,
//   checks: [
//     { name: 'postgres', status: 'healthy', latency_ms: 5 },
//     { name: 'redis', status: 'healthy', latency_ms: 1 },
//     { name: 'payment-service', status: 'healthy', latency_ms: 45 }
//   ],
//   timestamp: '2025-01-15T10:30:00.000Z'
// }
```

### Health Endpoints

When using `setupObservability()`, these endpoints are automatically registered:

- `GET /health` - Liveness probe (always returns OK if process is running)
- `GET /health/live` - Alias for liveness probe
- `GET /health/ready` - Readiness probe (checks all registered dependencies)
- `GET /health/detailed` - Full health report with individual check results

## Express Middleware

### Individual Middleware

```typescript
import {
  metricsMiddleware,
  tracingMiddleware,
  requestLoggingMiddleware,
  errorMiddleware,
  metricsHandler,
} from '@companyos/observability';

const config = { service: serviceConfig };

// Apply middleware individually
app.use(requestLoggingMiddleware(config));
app.use(tracingMiddleware(config));
app.use(metricsMiddleware(config));

// Metrics endpoint
app.get('/metrics', metricsHandler());

// Error handler (must be last)
app.use(errorMiddleware(config));
```

### Configuration Options

```typescript
setupObservability(app, {
  service: serviceConfig,
  excludeRoutes: ['/health', '/metrics', '/internal/*'],
  requestLogging: true,
  tracing: true,
  routeNormalizer: (req) => req.route?.path || req.path,
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level | `info` |
| `OTEL_ENABLED` | Enable tracing | `true` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://localhost:4318` |
| `OTEL_SAMPLE_RATE` | Trace sample rate (0.0-1.0) | `1.0` |
| `PROMETHEUS_ENABLED` | Enable metrics | `true` |

## Templates

The package includes ready-to-use templates:

- `templates/dashboards/golden-signals.json` - Grafana dashboard for golden signals
- `templates/dashboards/slo-overview.json` - Grafana dashboard for SLO monitoring
- `templates/alerts/slo-burn-alerts.yaml` - Prometheus alerting rules

## Documentation

- [Observability Spec v0](./OBSERVABILITY_SPEC_V0.md) - Full specification
- [Compliance Checklist](./COMPLIANCE_CHECKLIST.md) - Service onboarding checklist

## API Reference

### Initialization

- `initializeObservability(config)` - Initialize all observability systems
- `shutdownObservability()` - Graceful shutdown

### Metrics

- `initializeMetrics(config)` - Initialize metrics registry
- `recordHttpRequest(method, route, status, duration, service)`
- `recordDbQuery(dbSystem, operation, duration, success, service)`
- `recordCacheOperation(cache, operation, hit, duration, service)`
- `recordJob(queue, jobType, status, duration, service)`
- `recordError(errorType, severity, service)`
- `getMetrics()` - Get Prometheus metrics string

### Logging

- `createLogger(config)` - Create a logger instance
- `createAuditLogger(logger)` - Create an audit logger
- `createRequestLogger(logger, context)` - Create request-scoped logger
- `logError(logger, context)` - Log error with context

### Tracing

- `initializeTracing(config)` - Initialize OpenTelemetry
- `getTracer(name?, version?)` - Get a tracer instance
- `withSpan(name, fn, options?)` - Execute function within span
- `startSpan(name, options?)` - Create a span manually
- `extractContext(headers)` - Extract trace context
- `injectContext(headers)` - Inject trace context

### SLOs

- `generateSloConfig(service, archetype)` - Generate SLO configuration
- `calculateErrorBudget(target, window, successRate, elapsed)` - Calculate budget
- `createAvailabilitySlo(service, target?, window?)` - Create availability SLO
- `createLatencySlo(service, threshold, percentile?, target?, window?)` - Create latency SLO

### Health

- `initializeHealth(config)` - Initialize health check system
- `registerHealthCheck(name, checkFn)` - Register a health check
- `runHealthChecks()` - Execute all health checks
- `createPostgresHealthCheck(pool)` - PostgreSQL health check
- `createRedisHealthCheck(client)` - Redis health check
- `createHttpHealthCheck(url, name)` - HTTP endpoint health check

## License

UNLICENSED - Internal use only
