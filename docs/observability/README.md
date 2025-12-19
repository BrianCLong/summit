# Observability Stack

This package wires OpenTelemetry-first instrumentation with Prometheus scraping, centralized structured logging, continuous profiling, and governance-ready audit retention. It is designed to propagate correlation IDs across the service mesh while capturing agent cost/success KPIs, resource utilization, and profiling data in a single control plane.

## Architecture at a Glance

- **OpenTelemetry Collector** (`infra/observability/otel-collector.yaml`) centralizes OTLP ingest, k8s resource enrichment, correlation ID extraction, and tail-based sampling. Traces export to Tempo and the mesh gateway; metrics flow to Prometheus/remote-write; logs go to Loki and the OTLP mesh.
- **Prometheus Scraping** (`infra/observability/service-monitors.yaml`) defines ServiceMonitors/PodMonitors for the API, OTEL collector, agent runtimes, and profiling stack.
- **Logging Pipeline** (`infra/observability/vector.yaml`) deploys Vector as a DaemonSet to ship structured Kubernetes logs with correlation IDs to Loki and OTLP.
- **Profiling** (`infra/observability/profiling.yaml`) deploys Pyroscope with Parca agents for continuous profiling with metrics exposed for dashboards/alerts.
- **Dashboards** (`infra/observability/grafana-dashboards`) ships Grafana JSON for agent KPIs and mesh/system health; mount via ConfigMap provisioning in Grafana.
- **Alerting Rules** (`infra/observability/prometheus-rules.yaml`) covers latency/error SLOs, correlation coverage, profiling gaps, and agent-specific cost/failure thresholds.

## Correlation & Instrumentation

- All services MUST propagate W3C trace context and include `x-correlation-id` headers. The collector extracts correlation IDs from HTTP and gRPC metadata, maps them to `correlation_id`, and attaches k8s workload metadata for mesh-wide linkage.
- Resource and k8s attribute processors enrich spans/logs/metrics with namespace, pod, node, and workload labels to keep mesh routing observable.
- Tail sampling prioritizes errors and slow requests to preserve the most actionable traces under load.

## Metrics & Scraping Model

- Prometheus scrapes the OTEL collector metrics endpoint plus:
  - **IntelGraph API** golden signals via `ServiceMonitor/intelgraph-api`.
  - **Agent runtimes** (runtime, cost, success/failure rates) via `PodMonitor/agent-runtime`.
  - **Pyroscope/Parca** profiling ingestion metrics via `PodMonitor/profiler`.
- Mesh correlation coverage is tracked through `otel_request_correlation_total` and `otel_span_correlation_links_total`.

## Logging Pipeline

- Vector collects Kubernetes logs, enriches them with correlation ID, trace ID, service, and namespace, and forwards JSON payloads to Loki plus OTLP for trace-log correlation.
- Labels (`service`, `namespace`, `cluster`) keep multi-tenant dashboards tidy; headers and pod annotations are merged to recover correlation IDs when missing from payloads.

## Continuous Profiling

- Pyroscope runs centrally while Parca agents DaemonSet scrapes nodes; samples stream to Pyroscope and expose Prometheus metrics for ingestion health.
- Add the following env vars to workloads to enable profiling:
  - `PYROSCOPE_APPLICATION_NAME=<service>`
  - `PYROSCOPE_SERVER_ADDRESS=http://pyroscope.observability.svc.cluster.local:4040`

## Audit Trail Ingestion & Governance

- Emit audit events to OTLP logs with fields: `actor`, `subject`, `action`, `result`, `correlation_id`, `pii_tags`, `retention_class`.
- Loki retention policies must align with `docs/governance/DATA_RETENTION_POLICY.md`; default retention: 30d for app logs, 365d for audit events with compaction into cold storage.
- PII handling: mask high-risk fields at the source, apply pod annotations `correlation-id` and `retention_class` to drive Vector enrichment and downstream storage rules.
- Dashboards: use the Agent KPIs dashboard table for correlation coverage and add a Loki query panel for `audit` streams filtered by `actor`/`action`.

## Dashboards & Provisioning

- Import `agent-observability.json` for agent KPIs, latency, cost, error density, and correlation coverage.
- Import `system-health.json` for mesh traffic, API latency, resource saturation, and profiling ingestion.
- Provision via Grafana ConfigMap or `--dashboard-provider` mounted to `/var/lib/grafana/dashboards/observability`.

## Alerting & SLOs

- PrometheusRule adds coverage for:
  - API latency/error SLOs and CPU saturation.
  - Agent failure rate (>10%) and runtime cost spikes (> $50/30m).
  - Mesh error budget burn (>2% 5xx for 15m).
  - Correlation coverage (<95%) and profiling ingestion stalls.
- Wire alerts to Alertmanager routes that include service ownership, on-call rotation, and ticket auto-creation.

## Runbook (Deploy & Validate)

1. **Deploy core stack**
   ```bash
   kubectl apply -f infra/observability/otel-collector.yaml
   kubectl apply -f infra/observability/vector.yaml
   kubectl apply -f infra/observability/profiling.yaml
   kubectl apply -f infra/observability/service-monitors.yaml
   kubectl apply -f infra/observability/prometheus-rules.yaml
   ```
2. **Validate data paths**
   - Verify collector health: `kubectl -n observability port-forward svc/otel-collector 13133:13133` then `curl localhost:13133/healthz`.
   - Check correlation in spans: query Tempo for `correlation_id` attribute and ensure link to logs in Loki.
   - Confirm Prometheus targets are `UP` for OTEL, API, agents, and profiler.
   - Validate profiling ingestion: `pyroscope.ingester.samples` metrics > 0 and dashboard panel rendering.
3. **Audit trail checks**
   - Ensure audit streams present in Loki with `retention_class="audit"` label; sample query: `{stream="stderr",retention_class="audit"}`.
   - Confirm redaction by spot-checking log payloads for masked PII fields.
4. **Alert smoke**
   - Temporarily set `for` windows to `1m` in a test namespace and generate a 5xx storm to confirm Alertmanager routes fire.

## Validation Checklist

- [ ] Traces, metrics, and logs show consistent `correlation_id` across services.
- [ ] Prometheus scraping shows all targets `UP` and agent KPIs present.
- [ ] Grafana dashboards load from ConfigMap and render agent/system panels.
- [ ] Profiling samples ingest continuously; stall alert remains inactive.
- [ ] Audit trail logs respect retention class and PII masking.
