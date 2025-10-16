# Observability First Program Plan

## Overview

- **Objective:** Deliver language-specific telemetry SDKs, correlated logging, and “golden” operational dashboards so that every Summit service emits RED/USE metrics, traces, and structured events from day one.
- **Timebox:** Two sprints (Go + TypeScript) with Python landing in sprint three.
- **Acceptance Guardrails:** <2% CPU overhead for instrumentation, <3s dashboard render time, <5%/week false alert rate.

## Sprint 1–2 Scope (Go + TypeScript)

### Language SDKs

| SDK        | Deliverables                                                                                                                                             | Notes                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Go         | HTTP and gRPC middleware, RED/USE metrics, structured error taxonomy, trace/span propagation helpers, OTEL exporter with Prometheus bridge.              | Embed `context.Context` helpers for request/trace IDs; default sampling policy documented in `docs/sdk/go/sampling.md`. |
| TypeScript | Express/Fastify middleware, RED/USE metrics decorators, structured error classes, OTEL exporter via OTLP/HTTP, Winston transport with trace correlation. | Provide `@summit/telemetry` package with `configureTelemetry()` bootstrap that wires logging + metrics.                 |

### Shared SDK Requirements

- Structured logging only (JSON payloads with severity, service, environment, and `trace_id`).
- Unified error taxonomy: `user_error`, `system_error`, `dependency_error`, `unknown_error` with associated status mapping.
- Trace IDs inserted into logs via middleware and request context utilities.
- Default sampling policy doc covering head-based 20% sample + tail-based forced sampling for errors.
- Reference example service instrumented end-to-end (Go for sprint 1, TypeScript for sprint 2).

### Dashboards & Alerts

- **Golden service dashboard:** RED metrics, latency histogram, error breakdown, saturation heatmap, log volume, synthetic probe status.
- **Dependency dashboard:** Upstream/downstream call success rates, queue depth, retry/fallback counters, dependency latency budget burn.
- **Infra dashboard:** Node CPU/memory, container restarts, network throttling, instrumentation overhead panel.
- **SLO Kits:** Availability, latency, and error budget alerts with paging tier definitions and runbooks.
- All dashboards designed for Grafana with panel load <3s using optimized PromQL.

### Synthetic Probes

- Canary HTTP probe hitting `/healthz` and `/readyz` endpoints for every service.
- Scheduled flow probe that exercises a critical user journey every 5 minutes with SLA assertions.
- Canary deployment smoke-check verifying telemetry pipeline availability.

## Sprint 3 Scope (Python)

- Release Python SDK with FastAPI/Django middleware, Celery instrumentation, and OTEL exporter.
- Backfill documentation parity (`docs/sdk/python/*`) and update dashboards with Python service exemplars.
- Expand synthetic probes to cover async worker checks and queue lag SLOs.

## Documentation & Operations

- SDK API docs generated via Typedoc (TS), Godoc (Go), and Sphinx (Python); publish into `docs/generated/telemetry`.
- Provide onboarding guide for service teams covering installation, configuration, and sampling policy adjustments.
- Maintain “alert fire-drill” log documenting response runbooks, results, and follow-ups.
- Ensure Prometheus/Grafana stack configuration stored under `infrastructure/observability/` with Terraform modules for reproducible deploys.

## Metrics for Success

- **CPU Overhead Validation:** Load-test example services before and after instrumentation; capture delta in synthetic probe report.
- **Dashboard Performance:** Grafana snapshot with render times <3s for top dashboards.
- **Alert Quality:** Weekly review of SLO alert history to confirm <5% false positive rate; tune thresholds accordingly.

## Dependencies & Risks

- Need OTEL collector tuned for low overhead; risk of missing trace correlation if downstream services are not upgraded in time.
- Mitigate via compatibility shims and a cross-team migration calendar.
