# Observability Runbook

Use this runbook to triage incidents, interpret dashboards, and query logs/traces across IntelGraph services.

## Incident Triage (pager or Slack)

1. **Acknowledge & identify**
   - Alert name, service label, and severity (`page` routes to PagerDuty).
   - Linked runbook URL from the alert annotation; confirm current deploy version.
2. **Check health probes**
   - Open Grafana → IntelGraph Overview → *Request Error Rate* and *Health Probe* panels.
   - Validate `/health` endpoints directly: `curl -v http://<service>/health/ready`.
3. **Validate SLO burn**
   - Inspect *Request Error Rate (5m)* and *Service p95 latency* panels; confirm whether burn-rate alerts align with traffic spikes.
   - Compare blackbox probe success with service metrics to rule out ingress/network issues.
4. **Scope blast radius**
   - Use Grafana variables (`tenant`, `service`) to filter panels.
   - Check cache hit/miss panel; falling hit rates often precede latency spikes.
5. **Escalate**
   - If error budget burn continues after 15 minutes or health probes stay <99%, escalate to the on-call service owner and infra.

## Dashboard Interpretation

- **Request Error Rate (5m):** Percentage of 5xx responses per service; thresholds at 1% (warning) and 2% (critical).
- **Request Throughput (RPS):** Per-service traffic. Spikes with stable latency usually safe; spikes with rising latency imply capacity or cache pressure.
- **Cache Hit vs Miss:** Drops in hits correlate with higher p95 latency. Investigate Redis/edge cache health and invalidation volume.
- **Service p95 Latency:** Correlate with trace spans using the Jaeger links in panel descriptions.
- **Inference Throughput vs Errors:** Identifies model-specific regressions; coordinate with ML owners if failure lines climb.

## Log and Trace Queries

- **Loki (structured logs):**
  - Meta-router routing decisions: `{app="meta-orchestrator"} | json | meta_router_assembly_completed`
  - Narrative engine lifecycle: `{app="narrative-engine"} | json | line_format "{{.event}} latency_ms={{.durationMs}} queue={{.queuedEvents}}"`
- **Jaeger/OTel:**
  - Service filter: `service = intelgraph-gateway` or `intelgraph-api`.
  - Trace slowest operations: search for `duration > 1000ms` and operation name `POST /graphql`.
  - Follow cache misses: look for span attribute `cache.hit=false` and correlate with Redis exporter metrics.

## Stabilization Checklist

- Clear stuck deploys or roll back to last green build.
- Verify data stores: Postgres/Neo4j/Redis exporter panels should be healthy; restart if probes fail.
- Confirm rate limits and feature flags: sudden error spikes can map to toggled flags or throttling.
- After mitigation, add a timeline to the incident doc and attach relevant Grafana screenshots.
