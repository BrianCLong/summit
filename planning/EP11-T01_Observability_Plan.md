# EP11-T01 OpenTelemetry Instrumentation Plan

## Strategy
We will use OpenTelemetry (OTel) for all signals: Traces, Metrics, and Logs.

## Architecture
*   **Collectors**: Deploy OTel Collector as a sidecar (K8s) or agent (VM).
*   **Backend**: Prometheus (Metrics), Jaeger (Traces), Loki (Logs).
*   **Protocol**: OTLP/gRPC.

## Service Instrumentation

### Node.js Services (API, Ingest)
*   **SDK**: `@opentelemetry/sdk-node`
*   **Auto-instrumentation**: `@opentelemetry/auto-instrumentations-node` (covers Express, Http, GraphQL).
*   **Manual**:
    *   Spans for critical business logic (e.g., `ingest.process_record`).
    *   Attributes: `tenant.id`, `user.id`, `correlation_id`.

### Python Services (AI, Analytics)
*   **SDK**: `opentelemetry-distro`
*   **Auto-instrumentation**: `opentelemetry-instrumentation` (covers Flask, Requests, Psycopg2).

### Frontend (React)
*   **SDK**: `@opentelemetry/sdk-trace-web`
*   **Instrumentation**: `@opentelemetry/instrumentation-document-load`, `@opentelemetry/instrumentation-user-interaction`.
*   **Context Propagation**: Inject `traceparent` header in API calls.

## Key Metrics (SLIs)
1.  **Latency**: `http.server.duration` (P95, P99).
2.  **Traffic**: `http.server.requests` (Rate).
3.  **Errors**: `http.server.requests` (Status=5xx).
4.  **Saturation**: `system.cpu.utilization`, `process.memory.usage`.

## Logging Standards
*   **Format**: JSON.
*   **Required Fields**: `trace_id`, `span_id`, `service.name`, `level`, `message`, `timestamp`.
*   **PII Scrubbing**: Logs must be sanitized before export.
