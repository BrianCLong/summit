# Logging and Debugging Infrastructure

## Overview

The IntelGraph platform uses a comprehensive logging infrastructure that provides:

- **Standardized Structured Logging**: Consistent JSON-formatted logs across all services
- **Correlation Tracking**: Trace requests across distributed services
- **Centralized Log Aggregation**: Loki for collecting and querying logs
- **OpenTelemetry Integration**: Seamless correlation with distributed tracing
- **Sensitive Data Protection**: Automatic redaction of secrets and PII
- **Retention Policies**: Automated archival and compliance
- **Debugging Tools**: CLI utilities for log querying and analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Services                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │API Server│  │  Worker  │  │ GraphQL  │  │  Other   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│              @intelgraph/logger Package                     │
│              (Winston + Loki Transport)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        v                  v                  v
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Console    │   │  File Logs   │   │     Loki     │
│   (Dev/Debug)│   │  (Rotation)  │   │ (Aggregation)│
└──────────────┘   └──────────────┘   └──────┬───────┘
                                              │
                    ┌─────────────────────────┼─────────────┐
                    │                         │             │
                    v                         v             v
            ┌──────────────┐         ┌──────────────┐  ┌────────┐
            │   Promtail   │         │   Grafana    │  │  CLI   │
            │(Log Collector)│        │(Visualization)│  │ Tools  │
            └──────────────┘         └──────────────┘  └────────┘
                    │
                    v
            ┌──────────────┐
            │ Docker Logs  │
            │ System Logs  │
            │   K8s Logs   │
            └──────────────┘
```

## Components

### 1. @intelgraph/logger Package

**Location**: `packages/logger/`

Core logging library that provides:
- Structured logging with Winston
- Correlation ID tracking with AsyncLocalStorage
- Loki integration
- Sensitive data sanitization
- Multiple output transports

**Documentation**: [packages/logger/README.md](../packages/logger/README.md)

### 2. Loki (Log Aggregation)

**Location**: `docker-compose.observability.yml`

Grafana Loki is the central log aggregation system:
- Stores logs from all services
- Provides LogQL query language
- Integrates with Grafana for visualization
- 30-day hot retention, archived to S3

**Configuration**: `monitoring/loki/local-config.yaml`

**Access**: http://localhost:3100

### 3. Promtail (Log Collection)

**Location**: `monitoring/promtail/config.yml`

Collects logs from multiple sources:
- Application log files
- Docker container logs
- Kubernetes pod logs
- System logs (syslog, nginx, etc.)

**Features**:
- Automatic label extraction
- JSON parsing
- Log enrichment
- Multi-source collection

### 4. Grafana (Visualization)

**Location**: `docker-compose.observability.yml`

Provides log visualization and querying:
- LogQL query builder
- Log dashboards
- Alert configuration
- Integration with Prometheus and Jaeger

**Access**: http://localhost:3001
**Credentials**: admin / admin

### 5. Debugging Tools

**Location**: `tools/logging-debug/`

CLI utilities for log analysis:

- **log-query**: Query logs from Loki
  ```bash
  log-query --service api-service --level error --since 1h
  ```

- **log-analyze**: Analyze log patterns and metrics
  ```bash
  log-analyze --service api-service --since 24h
  ```

## Quick Start

### 1. Start Observability Stack

```bash
# Start full observability stack (includes Loki, Promtail, Grafana)
docker-compose -f docker-compose.observability.yml up -d

# Or use make target
make up-observability
```

### 2. Initialize Logger in Your Service

```typescript
import { initializeLogger, logger } from '@intelgraph/logger';

// Initialize at startup
initializeLogger({
  serviceName: 'my-service',
  level: 'info',
  loki: true,
});

// Use throughout application
logger.info('Application started', { port: 3000 });
```

### 3. Add Correlation Middleware

```typescript
import { correlationMiddleware } from '@intelgraph/logger/middleware';

app.use(correlationMiddleware());
```

### 4. Query Logs

```bash
# Using CLI tool
pnpm log-query --service my-service --since 1h

# Or in Grafana
# Navigate to http://localhost:3001/explore
# Select Loki datasource
# Query: {service="my-service"}
```

## Key Features

### Correlation Tracking

Every request gets a unique correlation ID that flows through all services:

```typescript
// Automatically added by middleware
req.correlationId  // e.g., "550e8400-e29b-41d4-a716-446655440000"

// Query all logs for a request
{service=~".*"} | json | correlationId="550e8400-e29b-41d4-a716-446655440000"
```

### OpenTelemetry Integration

Logs are automatically correlated with traces:

```typescript
// Trace and span IDs automatically included in logs
{
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "message": "Processing request",
  ...
}
```

### Sensitive Data Redaction

Automatically redacts sensitive fields:

```typescript
logger.info('User data', {
  username: 'john',
  password: 'secret123',  // Automatically redacted
  apiKey: 'key-abc',      // Automatically redacted
});

// Output: { username: 'john', password: '[REDACTED]', apiKey: '[REDACTED]' }
```

### Structured Logging

All logs are JSON-formatted for easy querying:

```json
{
  "timestamp": "2025-11-20T10:30:45.123Z",
  "level": "info",
  "message": "Request completed",
  "service": "api-service",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "method": "POST",
  "path": "/api/users",
  "statusCode": 201,
  "duration": 156
}
```

## Log Retention

| Environment | Hot Storage | Cold Storage | Total |
|------------|-------------|--------------|-------|
| Production | 30 days (Loki) | 1 year (S3) | 13 months |
| Staging | 7 days | Not archived | 7 days |
| Development | 7 days | Not archived | 7 days |

**Archival**: Automated daily via `scripts/logging/archive-logs.sh`

**Documentation**: [LOGGING_RETENTION_POLICY.md](./LOGGING_RETENTION_POLICY.md)

## Common Queries

### Find Errors by Service

```logql
{service="api-service", level="error"}
```

### Trace User Request

```logql
{service=~".*"} | json | userId="user-123" | line_format "{{.timestamp}} {{.message}}"
```

### Find Slow Operations

```logql
{service="api-service"} | json | duration > 1000
```

### Authentication Failures

```logql
{service="auth-service"} | json | message =~ "(?i)failed.*login"
```

### Rate of Errors

```logql
sum by (service) (rate({level="error"}[5m]))
```

## Debugging Workflows

### 1. Trace a Request

1. Get correlation ID from response headers or error message
2. Query logs: `log-query --correlation-id "xxx" --since 1h`
3. Review the flow through all services
4. Identify bottlenecks or failures

### 2. Debug Production Error

1. Find errors: `log-query --level error --service api-service --since 1h`
2. Get correlation ID from error
3. Trace full request flow
4. Identify root cause

### 3. Performance Investigation

1. Run analysis: `log-analyze --service api-service --since 24h`
2. Identify slow operations from report
3. Query specific operations
4. Trace slow requests

**Detailed Workflows**: [LOGGING_BEST_PRACTICES.md](./LOGGING_BEST_PRACTICES.md)

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info                  # Minimum log level
LOG_DIR=/var/log/intelgraph    # Log directory
LOKI_ENABLED=true               # Enable Loki integration
LOKI_URL=http://loki:3100      # Loki server URL

# OpenTelemetry
OTEL_SERVICE_NAME=my-service
OTEL_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

### Service Configuration

```typescript
initializeLogger({
  serviceName: 'my-service',      // Required
  level: 'info',                   // Log level
  console: true,                   // Console output
  file: true,                      // File output
  loki: true,                      // Loki integration
  lokiUrl: 'http://loki:3100',    // Loki URL
  maxFileSize: '100m',            // Max log file size
  maxFiles: '30d',                // Retention period
});
```

## Monitoring

### Metrics

The logging infrastructure exposes metrics:

- **Log ingestion rate** (logs/second)
- **Log volume** (bytes/second)
- **Error rate** (errors/total logs)
- **Loki storage usage**
- **Query latency**

**Access**: http://localhost:9090 (Prometheus)

### Alerts

Configured alerts:
- High error rate (>1% of requests)
- Loki storage >80% full
- Log ingestion failures
- Archival job failures

**Configuration**: `monitoring/prometheus/alerts-logging.yml`

## Costs

Estimated monthly costs for production:

| Component | Cost |
|-----------|------|
| Loki (hot storage) | $300 |
| S3 (cold storage) | $100 |
| Egress/queries | $50 |
| **Total** | **$450/month** |

**Optimization tips**:
- Adjust log levels in production
- Exclude health checks
- Use sampling for debug logs
- Archive to S3 Glacier

## Migration

To migrate existing services to the new logging infrastructure:

1. Install `@intelgraph/logger`
2. Update logger initialization
3. Add correlation middleware
4. Update environment variables
5. Test and deploy

**Detailed Guide**: [LOGGING_MIGRATION_GUIDE.md](./LOGGING_MIGRATION_GUIDE.md)

## Best Practices

1. **Always use structured logging** - Pass objects, not strings
2. **Include correlation context** - Use middleware
3. **Choose appropriate log levels** - Error for errors, info for business events
4. **Never log sensitive data** - PII, passwords, tokens
5. **Optimize for production** - Use appropriate log levels
6. **Query efficiently** - Use labels and time ranges

**Comprehensive Guide**: [LOGGING_BEST_PRACTICES.md](./LOGGING_BEST_PRACTICES.md)

## Troubleshooting

### Logs not appearing in Loki

1. Check Loki is running: `curl http://localhost:3100/ready`
2. Check Promtail is running: `curl http://localhost:9080/ready`
3. Verify service configuration
4. Check Loki logs: `docker logs loki`

### Missing correlation IDs

1. Ensure middleware is first in the chain
2. Verify AsyncLocalStorage is working
3. Check for context loss in async operations

### High query latency

1. Use more specific labels
2. Narrow time ranges
3. Limit result count
4. Check Loki resource allocation

## Documentation

- **Getting Started**: [packages/logger/README.md](../packages/logger/README.md)
- **Best Practices**: [LOGGING_BEST_PRACTICES.md](./LOGGING_BEST_PRACTICES.md)
- **Migration Guide**: [LOGGING_MIGRATION_GUIDE.md](./LOGGING_MIGRATION_GUIDE.md)
- **Retention Policy**: [LOGGING_RETENTION_POLICY.md](./LOGGING_RETENTION_POLICY.md)
- **Grafana Loki Docs**: https://grafana.com/docs/loki/
- **OpenTelemetry Docs**: https://opentelemetry.io/docs/

## Support

- **Slack**: #platform-engineering
- **Issues**: GitHub Issues
- **On-call**: PagerDuty rotation

---

**Version**: 1.0
**Last Updated**: 2025-11-20
**Owner**: Platform Engineering Team
