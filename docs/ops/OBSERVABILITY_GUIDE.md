# Summit Observability Guide

This guide describes the comprehensive observability stack implemented for the Summit platform. It includes Prometheus metrics, Grafana dashboards, OpenTelemetry distributed tracing, structured logging, and automated alerting.

## 1. Metrics (Prometheus)

The Summit API exposes a Prometheus-compatible metrics endpoint.

- **Endpoint:** `GET /metrics`
- **Port:** Defaults to `4000` (API port)
- **Format:** Prometheus text format

### Key Metrics Categories

- **System Health:** `http_request_duration_seconds`, `db_connections_active`, `process_resident_memory_bytes`, `nodejs_eventloop_lag_seconds`.
- **Business Logic:** `business_user_signups_total`, `business_revenue_total`, `maestro_deployments_total`.
- **AI/LLM:** `llm_tokens_total`, `llm_request_duration_seconds`, `ai_jobs_processing`, `docling_cost_usd_total`.
- **Graph:** `graph_nodes_total`, `graph_edges_total`, `graph_operation_duration_seconds`.
- **Security:** `tenant_scope_violations_total`, `pbac_decisions_total`.

### Accessing Metrics
You can curl the endpoint locally:
```bash
curl http://localhost:4000/metrics
```

## 2. Distributed Tracing (OpenTelemetry)

We use OpenTelemetry (OTel) to trace requests across services (HTTP, Express, GraphQL, PostgreSQL, Redis).

- **Protocol:** OTLP (HTTP)
- **Exporters:** OTLP Trace Exporter and Jaeger Exporter.
- **Auto-Instrumentation:** Enabled for HTTP, Express, GraphQL, PostgreSQL, and Redis.

### Configuration
Tracing is configured via environment variables or `server/src/config.ts`.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`: URL for the OTLP collector (e.g., `http://otel-collector:4318/v1/traces`).
- `JAEGER_ENDPOINT`: URL for Jaeger (e.g., `http://jaeger:14268/api/traces`).
- `OTEL_SAMPLE_RATE`: Sampling rate (0.0 to 1.0).

### Viewing Traces
Traces can be viewed in Jaeger or any OTLP-compatible backend (Honeycomb, Grafana Tempo).
Traces include:
- Full HTTP request lifecycle.
- Database queries (sanitized).
- Cache operations.
- GraphQL resolver execution.

## 3. Dashboards (Grafana)

Pre-built Grafana dashboards are located in `observability/dashboards/`.

### Summit Overview (Enhanced)
File: `observability/dashboards/summit-overview.json`
Provides a high-level view of system health:
- **Request Rate & Latency (P95)**
- **Global Error Rate (5xx)**
- **Active DB Connections** (Postgres, Neo4j)
- **Maestro Jobs Processing**
- **LLM Token Usage Rate**
- **Memory Usage**

### Import Instructions
1. Login to Grafana.
2. Go to **Dashboards** > **Import**.
3. Upload the JSON file or paste the content.
4. Select your Prometheus datasource.

## 4. Structured Logging (Pino)

Logs are output in JSON format for easy ingestion by aggregators (ELK, Loki, Datadog).

### Features
- **Correlation IDs:** `correlationId`, `traceId`, and `requestId` are injected into every log entry to link logs with traces.
- **Redaction:** Sensitive fields (tokens, passwords, PII) are automatically redacted.
- **Context:** Logs include `tenantId`, `userId`, and `service` context.

### Example Log Entry
```json
{
  "level": "INFO",
  "time": "2023-10-27T10:00:00.000Z",
  "pid": 123,
  "hostname": "summit-api",
  "correlationId": "abc-123",
  "traceId": "1234567890abcdef",
  "tenantId": "tenant-1",
  "msg": "Request completed",
  "req": { ... },
  "res": { ... }
}
```

## 5. Alerting

Alert rules are defined in `observability/alert-rules.yml`.

### Critical Alerts
- **HighHttpErrorRate:** > 1% 5xx errors.
- **PostgresConnectionSaturation:** > 80% connection usage.
- **PipelineDown:** Data pipeline availability < 99%.
- **MaestroJobFailures:** Job failure rate > 0.

Configure your Alertmanager to use these rules.
