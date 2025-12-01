# Observability Standard

This document defines the observability standards for the Summit platform, covering logging, metrics, and tracing.

## 1. Logging

All services must emit structured logs in JSON format (in production).

### 1.1 Format
Logs must include the following fields:
- `level`: Log level (INFO, WARN, ERROR, DEBUG).
- `time`: ISO 8601 timestamp.
- `msg`: Human-readable message.
- `correlationId`: A unique ID for the request (propagated across services).
- `service`: Service name (e.g., `intelgraph-server`).
- `context`: (Optional) Object containing relevant context.

### 1.2 Levels
- **ERROR**: Actionable errors that require attention.
- **WARN**: Unexpected situations that are handled but might indicate a problem.
- **INFO**: operational events (startup, shutdown, significant business events).
- **DEBUG**: Verbose information for troubleshooting.

## 2. Metrics

Metrics are collected via Prometheus.

### 2.1 Naming Convention
- Prefix: `intelgraph_<service>_`
- Format: `snake_case`
- Example: `intelgraph_server_http_request_duration_seconds`

### 2.2 Standard Metrics
Every service must export:
- HTTP Request Duration (Histogram)
- HTTP Request Count (Counter)
- Error Rate (Counter)
- Runtime Metrics (Memory, CPU)

## 3. Tracing

Distributed tracing is implemented via OpenTelemetry standards.

### 3.1 Propagation
- Services must accept and propagate `x-correlation-id` (or `traceparent`) headers.
- The `correlationId` must be injected into every log entry.

### 3.2 Implementation
- Use `AsyncLocalStorage` in Node.js to store the correlation ID for the duration of the request.
