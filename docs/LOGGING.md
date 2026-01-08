# Structured Logging & Observability Guide

This guide documents the unified structured logging strategy for API services, asynchronous workers, and data pipelines. All log events must be wrapped in the **telemetry envelope** defined in the Structured Logging Unification RFC (`docs/rfcs/structured-logging-telemetry-envelope.md`). The envelope is schema-controlled, privacy-aware, and trace-friendly so that the same dashboards, alerts, and transports work across runtime domains.

## Overview

- **Library**: `pino` (Node.js)
- **Format**: JSON (Consistent across Development and Production)
- **Tracing**: OpenTelemetry SDK integration for distributed tracing
- **Correlation**: `correlationId`, `traceId`, and `spanId` propagated across all logs and HTTP requests

## Log Levels

We adhere to the following log levels:

| Level   | Description                                                              | Usage Guideline                                                                |
| ------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `ERROR` | Fatal errors or exceptions that require immediate attention              | Database connection failures, unhandled exceptions, critical service failures. |
| `WARN`  | unexpected events that don't stop execution but might indicate a problem | Deprecated API usage, retried operations, near-miss quota limits.              |
| `INFO`  | Normal application lifecycle events                                      | Server startup, successful job completion, key business milestones.            |
| `DEBUG` | Detailed information for debugging                                       | Request details, complex logic steps, payload contents (redacted).             |

## Telemetry Envelope Format

All logs are output as JSON objects that conform to the telemetry envelope schema. Required fields include `timestamp`, `severity`, `service`, `serviceRole`, `env`, `traceId`, `spanId`, `actor`, `request`, and `msg`. Optional fields such as `data`, `metrics`, `tags`, and `error` may be added when relevant.

```json
{
  "envelopeVersion": "v1",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "severity": "INFO",
  "service": "intelgraph-server",
  "serviceRole": "api",
  "env": "production",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "method": "POST",
    "path": "/api/v1/resource",
    "source": "http",
    "remoteIp": "::1",
    "tenantId": "tenant-123"
  },
  "actor": {
    "type": "user",
    "id": "user-456",
    "orgId": "org-xyz"
  },
  "msg": "Request completed",
  "metrics": {
    "duration_ms": 150
  }
}
```

> **Compatibility note:** `correlationId` is still accepted during the dual-write window but `traceparent`/`baggage` headers are the canonical propagation mechanism.

### Sensitive Data Redaction

The telemetry envelope requires deterministic redaction. The following rules are enforced before serialization, with a second-pass denylist in the collector:

- Remove auth headers/tokens, credentials, payment data, PII (email/phone), and any field matching `(?i)(password|secret|token|key|credential|ssn|card|authorization|cookie)`.
- Add `redactionApplied: true` when any field is scrubbed to aid observability and alerting.

## Correlation & Distributed Tracing

### Correlation ID

Every HTTP request is assigned a `x-correlation-id` (or inherits one from the request header). This ID is present in every log message generated during that request's lifecycle.

### OpenTelemetry

All runtimes (API, worker, pipeline) use OpenTelemetry for distributed tracing. The telemetry envelope pulls `traceId`/`spanId`/`traceFlags` from the active OTEL context; `serviceRole` is set according to the runtime. This guarantees that logs, traces, and metrics correlate in Grafana/Tempo, Jaeger, or Elastic APM.

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
