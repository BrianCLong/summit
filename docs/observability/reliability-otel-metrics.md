# Reliability telemetry quickstart

This repository now emits focused OpenTelemetry traces and Prometheus metrics for the hottest reliability paths (ingest, graph query, GraphRAG). Use the steps below to explore the data locally and plug it into your dashboards.

## View metrics locally

1. Start the API server with tracing + metrics exporters enabled (defaults to :4000 for HTTP and :9464 for the OTEL Prometheus exporter):

```bash
cd server
pnpm install
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces \
OTEL_SERVICE_NAME=intelgraph-server \
pnpm dev
```

2. Scrape in-process business metrics (including p50/p95 summaries and queue depth gauges):

```bash
curl -s http://localhost:4000/metrics | grep reliability_
```

3. Scrape OTEL SDK metrics directly if you run a co-located collector:

```bash
curl -s http://localhost:9464/metrics | head
```

4. Inspect latency percentiles and error rates in PromQL/Grafana:

```promql
histogram_quantile(0.50, rate(reliability_request_duration_seconds_bucket{endpoint="ingest"}[5m]))
histogram_quantile(0.95, rate(reliability_request_duration_seconds_bucket{endpoint="graph_query"}[5m]))
rate(reliability_request_errors_total{endpoint="rag"}[5m])
reliability_queue_depth{endpoint="ingest"}
tenant_query_budget_hits_total
```

## Load smoke (k6)

A minimal smoke that hits health, metrics, graph query, and GraphRAG endpoints lives in `k6/reliability-smoke.js`.

```bash
BASE_URL=http://localhost:4000 k6 run k6/reliability-smoke.js
```

The script only checks reachability and basic latency so it is safe for nightly CI or preview environments.

## Alert rule examples

Use the new metrics for SLO burn-rate or latency alerts:

- **Fast burn on ingest errors (2% in 5m):**

```promql
sum(rate(reliability_request_errors_total{endpoint="ingest"}[5m]))
/ sum(rate(reliability_request_duration_seconds_count{endpoint="ingest"}[5m])) > 0.02
```

- **p95 latency guardrail for GraphRAG (>750ms over 10m):**

```promql
histogram_quantile(0.95, rate(reliability_request_duration_seconds_bucket{endpoint="rag"}[10m])) > 0.75
```

Alert destinations can reuse existing PagerDuty/Slack routes; the expressions above drop straight into Alertmanager or Grafana Alerting.
