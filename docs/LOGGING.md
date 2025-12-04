# Structured Logging & Observability Guide

This service implements a comprehensive structured logging system designed for production observability using the ELK stack (Elasticsearch, Logstash, Kibana) or OpenTelemetry (OTEL).

## Overview

- **Library**: `pino` (Node.js)
- **Format**: JSON (Consistent across Development and Production)
- **Tracing**: OpenTelemetry SDK integration for distributed tracing
- **Correlation**: `correlationId`, `traceId`, and `spanId` propagated across all logs and HTTP requests

## Log Levels

We adhere to the following log levels:

| Level | Description | Usage Guideline |
|-------|-------------|-----------------|
| `ERROR` | Fatal errors or exceptions that require immediate attention | Database connection failures, unhandled exceptions, critical service failures. |
| `WARN` | unexpected events that don't stop execution but might indicate a problem | Deprecated API usage, retried operations, near-miss quota limits. |
| `INFO` | Normal application lifecycle events | Server startup, successful job completion, key business milestones. |
| `DEBUG` | Detailed information for debugging | Request details, complex logic steps, payload contents (redacted). |

## Structured Log Format

All logs are output as JSON objects with the following schema:

```json
{
  "level": "INFO",
  "time": "2023-10-27T10:00:00.000Z",
  "pid": 12345,
  "hostname": "api-worker-1",
  "service": "intelgraph-server",
  "env": "production",
  "msg": "Request completed",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "req": {
    "method": "POST",
    "url": "/api/v1/resource",
    "headers": { ... },
    "remoteAddress": "::1"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 150
}
```

### Sensitive Data Redaction

The following fields are automatically redacted from logs:
- `req.headers.authorization`
- `req.headers.cookie`
- `body.password`, `body.token`, `body.secret`
- `user.email`, `user.phone`

## Correlation & Distributed Tracing

### Correlation ID
Every HTTP request is assigned a `x-correlation-id` (or inherits one from the request header). This ID is present in every log message generated during that request's lifecycle.

### OpenTelemetry
The service is instrumented with OpenTelemetry. Trace IDs and Span IDs are automatically injected into logs to allow cross-referencing logs with traces in tools like Jaeger or Elastic APM.

To view traces:
1. Copy the `traceId` from a log entry.
2. Search for it in your tracing backend (e.g., Jaeger UI, Kibana APM).

## Integration with ELK / OpenTelemetry

### ELK Stack (Elasticsearch, Logstash, Kibana)
1. **Ingestion**: Use Filebeat or Fluentd to tail the application logs.
2. **Parsing**: Configure the processor to parse the JSON content. The structure is compatible with Elastic Common Schema (ECS) mappings.
3. **Index**: Send to Elasticsearch.
4. **Visualize**: Use Kibana to filter by `service`, `level`, or `correlationId`.

**Example Kibana Query:**
```kql
service: "intelgraph-server" AND level: "ERROR"
```

### OpenTelemetry Collector
The application exports metrics and traces via OTLP (HTTP/gRPC) if configured.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`: Set this env var to point to your collector.
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`: Set this env var to point to your collector.

## Error Handling

All errors should be logged using the `errorHandler` middleware or explicitly via `logger.error()`.
Always pass the error object as the first argument to capture the stack trace:

```typescript
try {
  // ...
} catch (err) {
  logger.error({ err, userId: user.id }, "Failed to process transaction");
}
```
