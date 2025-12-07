# Observability Standards & SLOs

This document defines the observability standards, Service Level Objectives (SLOs), and debugging workflows for the Summit platform.

## Core Philosophy

*   **Unified Context**: Every request, task, and job must carry a `correlationId` and `tenantId`.
*   **Structured Logging**: Logs must be machine-readable (JSON) and contain standard metadata.
*   **Metrics for KPIs**: Use metrics for aggregations (SLOs), logs for debugging specific events.
*   **Tracing for Latency**: Use traces to understand where time is spent in complex flows.

## 1. Logging Standards

We use a unified `Logger` abstraction (`server/src/observability/logging/logger.ts`).

### Format
All logs are emitted as JSON.
```json
{
  "level": "INFO",
  "time": "2023-10-27T10:00:00.000Z",
  "msg": "Executing Maestro Task",
  "service": "intelgraph-server",
  "correlationId": "uuid-...",
  "tenantId": "tenant-...",
  "runId": "...",
  "taskId": "...",
  "agent": "planner"
}
```

### Usage
```typescript
import { logger } from '../observability';

// Automatically grabs context (correlationId, tenantId) from AsyncLocalStorage
logger.info('Processing task', { taskId: '...' });

logger.error('Task failed', { taskId: '...', error: err.message });
```

### Redaction
Sensitive fields (passwords, tokens, full LLM prompts) must be redacted. The logger is configured to scrub common keys, but developers must ensure they do not log full PII payloads in the `msg` or custom fields.

## 2. Metrics Conventions

We use Prometheus-style metrics via the `Metrics` interface (`server/src/observability/metrics/metrics.ts`).

### Naming
*   Prefix: `summit_`
*   Snake_case: `summit_http_requests_total`

### Standard Metrics
| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `summit_api_requests_total` | Counter | `method`, `route`, `status`, `tenantId` | Total HTTP requests |
| `summit_api_latency_seconds` | Histogram | `method`, `route` | API Latency distribution |
| `summit_maestro_runs_total` | Counter | `status`, `tenantId` | Maestro orchestration runs |
| `summit_maestro_run_duration_seconds` | Histogram | `status` | Time to complete a run |
| `summit_llm_requests_total` | Counter | `provider`, `model`, `status` | LLM calls |
| `summit_llm_latency_seconds` | Histogram | `provider`, `model` | LLM latency |
| `summit_errors_total` | Counter | `code`, `component` | Global error counter |

### Cardinality Rules
*   **Do NOT** use `userId`, `runId`, `email` as metric labels. High cardinality kills Prometheus.
*   **DO** use `tenantId` (if < 10k tenants), `status`, `error_code`, `model_name`.

## 3. Tracing

We use OpenTelemetry compatible tracing.

### Canonical Spans
*   `http.server`: Incoming API requests.
*   `maestro.run`: End-to-end Maestro pipeline execution.
*   `maestro.task`: Individual agent task execution.
*   `llm.invoke`: Call to external LLM provider.
*   `webhook.receive`: Processing incoming webhook.

### Usage
```typescript
import { tracer } from '../observability';

await tracer.trace('my.operation', async (span) => {
    span.setAttribute('custom.attr', 'value');
    // ... work ...
});
```

## 4. Service Level Objectives (SLOs)

We define the following targets for Production MVP:

### API Availability
*   **Target**: 99.5% success rate (2xx/3xx/4xx excluding 5xx) over 30 days.
*   **Indicator**: `sum(rate(summit_api_requests_total{status!~"5.."}[5m])) / sum(rate(summit_api_requests_total[5m]))`

### API Latency
*   **Target**: 95% of requests complete in < 500ms (p95).
*   **Indicator**: `histogram_quantile(0.95, rate(summit_api_latency_seconds_bucket[5m]))`

### Maestro Reliability
*   **Target**: 99% of valid runs complete successfully.
*   **Indicator**: `sum(summit_maestro_runs_total{status="succeeded"}) / sum(summit_maestro_runs_total)`

### LLM Performance
*   **Target**: 99% of LLM calls respond within 10s (model dependent).

## 5. Debugging Guide

### Scenario: "A user says their run failed"

1.  **Get the `runId` or `correlationId`** from the user report or UI error message.
2.  **Search Logs**:
    *   `correlationId="<id>"` OR `runId="<id>"`
    *   Look for `level="ERROR"` logs to find the root cause.
3.  **Check Traces**:
    *   Find the trace associated with that `correlationId`.
    *   Look for the `maestro.task` span that failed.
    *   Check `llm.invoke` spans to see if the LLM provider timed out or returned garbage.
4.  **Check Metrics**:
    *   Is there a spike in `summit_errors_total`?
    *   Is `summit_llm_latency_seconds` elevated?

### Scenario: "System feels slow"

1.  **Check Dashboards**: Look at API Latency p95 and p99.
2.  **Drill Down**: Which route is slow? (e.g., `POST /api/maestro/runs`).
3.  **Trace**: Pick a sample slow trace for that route.
    *   Is it DB? Graph? LLM?
    *   If LLM is slow, it's likely the provider.
    *   If DB is slow, check query performance.
