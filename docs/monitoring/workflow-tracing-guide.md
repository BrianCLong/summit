# Workflow Tracing Guide

This guide explains how distributed tracing is enabled for Argo Workflows and the
associated feed-processor and ML Engine microservices. The configuration uses
Jaeger as the trace backend with OpenTelemetry instrumentation to propagate
context across workflow steps.

## Architecture Overview

- **Argo Workflows → Jaeger**: `workflow-controller` is configured to emit spans
  to the platform Jaeger collector and inject OpenTelemetry environment variables
  for workflow pods.
- **Node.js feed-processor**: Uses the OpenTelemetry Node SDK with Jaeger
  exporter, automatic HTTP/Redis/Postgres instrumentation, and explicit trace
  propagation when handing off Bull queue jobs.
- **Python ML Engine**: FastAPI, Celery, Redis, HTTPX, and Psycopg2 are
  instrumented with the OpenTelemetry SDK and Jaeger exporter.
- **Grafana**: The `Argo Workflow Tracing` dashboard surfaces workflow,
  feed-processor, and ML Engine spans with direct pivot to the Jaeger UI.

## Deploying Jaeger for Workflows

Apply the bundled manifest to deploy a production-ready Jaeger instance and
update the workflow controller configuration:

```bash
kubectl apply -f monitoring/jaeger/argo-workflows-tracing.yaml
```

The manifest:

- Enables the Argo controller tracing stanza and default workflow pod
  environment variables so pods automatically export spans.
- Deploys a Jaeger production strategy with ElasticSearch storage and ingress at
  `https://jaeger.intelgraph.local`.
- Exposes the Jaeger agent over UDP for in-cluster collectors while keeping OTLP
  enabled for OpenTelemetry SDKs.

## Service Instrumentation

### Feed Processor (Node.js)

Key elements are defined in
`services/feed-processor/src/tracing.ts` and `src/index.ts`:

1. The OpenTelemetry Node SDK boots with Jaeger exporter and instrumentations
   for HTTP, Undici (fetch), Postgres, and ioredis.
2. Spans wrap queue processing via `withJobSpan`, including queue metadata and
   workflow identifiers.
3. Trace context is injected into outbound HTTP requests and Bull job payloads
   (`traceparent`/`tracestate`) to keep spans connected through downstream
   services.

Set the following environment variables when running the service:

- `OTEL_EXPORTER_JAEGER_ENDPOINT` (default points at the cluster collector)
- `OTEL_SERVICE_NAME` (defaults to `feed-processor`)
- `OTEL_SDK_DISABLED=true` to disable tracing during local debugging

### ML Engine (Python)

Instrumentation lives in `ml/app/tracing.py` and is activated from
`ml/app/main.py` and `ml/app/tasks.py`.

1. A shared tracer provider is created with Jaeger exporter, populating service
   namespace/instance metadata.
2. FastAPI, Celery, Redis, HTTPX, and Psycopg2 are auto-instrumented to capture
   HTTP requests, async tasks, and database calls.
3. Celery workers call `instrument_worker()` during import so background tasks
   continue trace context from upstream workflow spans.

Environment variables mirror the Node service (`OTEL_EXPORTER_JAEGER_ENDPOINT`,
`OTEL_SERVICE_NAME`, optional credentials).

## Grafana Dashboard

Import `monitoring/dashboards/workflow-traces.json` into Grafana. The dashboard
provides:

- An end-to-end Argo Workflows trace search filtered by workflow name/status.
- Focused panels for feed-processor and ML Engine spans keyed by
  `workflow.job_id` / `workflow.run_id` attributes.
- Troubleshooting notes for correlating traces with Prometheus latency panels.

## Operational Tips

- Use `traceparent` values surfaced in workflow logs to jump directly to spans in
  Jaeger.
- Combine the dashboard with Argo `workflow` metrics to spot bottlenecks.
- When testing locally, run Jaeger all-in-one via `docker-compose.monitoring.yml`
  and export `OTEL_EXPORTER_JAEGER_ENDPOINT=http://localhost:14268/api/traces`.
