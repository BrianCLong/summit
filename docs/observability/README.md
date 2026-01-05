# Observability Stack

This package deploys a production-grade OpenTelemetry-first stack with Prometheus scraping, centralized structured logging, continuous profiling, and governance-ready audit retention. All pipelines propagate correlation IDs across the mesh and expose agent runtime KPIs (success, failure, latency, and cost), resource utilization, and profiling health.

## Architecture

- **OpenTelemetry Collector** (`infra/observability/otel-collector.yaml`)
  - Deploys in the `observability` namespace with OTLP (gRPC/HTTP) ingress, Prometheus receiver, spanmetrics/servicegraph connectors, and a logs-to-metric path for audit trails.
  - Correlation-aware processors enrich spans/logs/metrics with `correlation_id`, `mesh.correlation_id`, k8s workload metadata, `retention_class`, and PII tags while tail-sampling errors, slow requests, and audit events.
  - Exports traces to Tempo and mesh OTLP gateway, metrics to Prometheus and remote-write, and logs to Loki/OTLP.
- **Prometheus Scraping** (`infra/observability/service-monitors.yaml`)
  - ServiceMonitor/PodMonitor coverage for the collector, IntelGraph API, agent runtimes (runtime/cost/success/failure), Pyroscope/Parca, and Vector log pipeline with node/namespace relabeling for resource attribution.
- **Logging Pipeline** (`infra/observability/vector.yaml`)
  - Vector DaemonSet enriches Kubernetes logs with correlation ID/trace ID, service, namespace, retention class, and PII tags; ships JSON logs to Loki and OTLP, and exposes Prometheus metrics.
- **Grafana Dashboards** (`infra/observability/grafana/dashboards/*.json` + ConfigMap `infra/observability/grafana/dashboards-configmap.yaml`)
  - `agent-observability.json` for agent KPIs, cost, correlation coverage, audit rates, profiling, and log-pipeline errors.
  - `system-health.json` for mesh traffic, API latency, collector/logging uptime, resource utilization, profiling, and audit flow.
- **Alerting Rules** (`infra/observability/prometheus-rules.yaml`)
  - Alerts for collector reachability, API latency/error rates, agent failures/cost/latency, mesh error budget burn, correlation coverage, log shipping issues, profiling stalls, audit gaps, and missing scrape targets.
- **Continuous Profiling** (`infra/observability/profiling.yaml`)
  - Pyroscope Deployment plus Parca Agent DaemonSet with Prometheus exposure; panels and alerts track ingestion health.
- **Audit Trail Governance**
  - Audit events ingested via OTLP logs with `retention_class=audit` and PII metadata; `logs_to_metric` connector emits `audit_events_total` for dashboards/alerts.

## Correlation & Instrumentation

- All services MUST propagate W3C tracecontext plus `x-correlation-id`/`correlation-id` headers; collectors map them to `correlation_id` and attach trace IDs for log correlation.
- `k8sattributes` and resource processors add namespace, pod, node, cluster, workload labels to every signal for mesh-wide filtering.
- Tail sampling prioritizes errors, slow requests (>750ms), and audit-class traffic to preserve actionable traces under load.

## Metrics & Scraping Model

- Prometheus scrapes:
  - OpenTelemetry Collector self-metrics and Prometheus/remote-write outputs.
  - IntelGraph API golden signals (`http_request_duration_seconds_bucket` and `http_requests_total`).
  - Agent runtimes (`agent_requests_total`, `agent_request_duration_seconds_bucket`, `agent_runtime_cost_total`) with namespace/runtime relabeling.
  - Vector log pipeline health (`vector_errors_total`, `vector_processed_events_total`) and profiling (`pyroscope_*`) plus audit-derived `audit_events_total`.
- Derived metrics from spanmetrics/servicegraph power mesh flow views and SLO burn calculations.

## Logging Pipeline

- Vector enriches Kubernetes logs with correlation ID, trace ID, service, namespace, retention class, and PII tags from pod annotations.
- Logs ship to Loki with structured JSON labels (`service`, `namespace`, `correlation_id`, `retention_class`) and to OTLP for trace-log correlation.
- Prometheus exporter on Vector exposes throughput/error metrics for alerting and dashboards.

## Continuous Profiling

- Pyroscope central UI with Parca agents scraping nodes; samples stream to Pyroscope and emit Prometheus metrics for ingestion health.
- Workloads should set:
  - `PYROSCOPE_APPLICATION_NAME=<service>`
  - `PYROSCOPE_SERVER_ADDRESS=http://pyroscope.observability.svc.cluster.local:4040`

## Audit Trail Ingestion & Governance

- Emit audit events to OTLP logs with fields: `actor`, `subject`, `action`, `result`, `correlation_id`, `pii_tags`, `retention_class` (`audit` for long-lived storage).
- Loki retention must respect `docs/governance/DATA_RETENTION_POLICY.md`: default 30d for application logs, 365d for audit with compaction to cold storage.
- PII handling: mask at source; use pod annotations (`correlation-id`, `retention-class`, `pii-tags`) to drive Vector enrichment and downstream storage/alert policies.
- Dashboards include audit rate panels; `audit_events_total` powers the `AuditTrailMissing` alert.

## Dashboards & Provisioning

- Apply the ConfigMap to mount dashboards at `/var/lib/grafana/dashboards/observability` or use Grafana provisioning flags.
  ```bash
  kubectl apply -f infra/observability/grafana/dashboards-configmap.yaml
  ```
- Dashboards included:
  - `agent-observability.json`: agent KPIs, correlation coverage, audit flow, profiling, log pipeline errors.
  - `system-health.json`: API/mesh health, collector/logging uptime, resource utilization, profiling, audit rates.

## Alerting & SLOs

- PrometheusRule covers:
  - API latency/error SLOs and CPU saturation.
  - Agent failure rate (>10%), runtime cost spikes, and latency SLO (>1s p95).
  - Mesh error budget burn (>2% 5xx over 15m) and missing scrape targets.
  - Correlation coverage (<95%), Vector log shipping errors, profiling ingestion stalls, and audit pipeline gaps.
- Wire alerts to Alertmanager routes with ownership metadata and ticket automation.
- Auto-ramp response: `docs/observability/runbooks/slo-ramp-reducer.md` defines SLO-to-ramp behavior and rollback steps.

## Runbook (Deploy & Validate)

1. **Deploy core stack**
   ```bash
   kubectl apply -f infra/observability/otel-collector.yaml
   kubectl apply -f infra/observability/vector.yaml
   kubectl apply -f infra/observability/profiling.yaml
   kubectl apply -f infra/observability/service-monitors.yaml
   kubectl apply -f infra/observability/prometheus-rules.yaml
   kubectl apply -f infra/observability/grafana/dashboards-configmap.yaml
   ```
2. **Validate ingestion paths**
   - Collector health: `kubectl -n observability port-forward svc/otel-collector 13133:13133` then `curl localhost:13133/healthz`.
   - Correlation: query Tempo for `correlation_id` and confirm logs in Loki share the same `trace_id`/`correlation_id` labels.
   - Prometheus targets: ensure OTEL, API, agents, Vector, Pyroscope are `UP` with namespace/node relabels.
   - Profiling: `sum(rate(pyroscope_samples_ingested_total[5m])) > 0` and panels render in Grafana.
3. **Audit trail checks**
   - Verify Loki streams labeled `retention_class="audit"`; sample query `{retention_class="audit"}`.
   - Confirm `audit_events_total` increases during audit activity and `AuditTrailMissing` alert remains inactive.
   - Spot-check payload redaction for PII and retention labels.
4. **Alert smoke**
   - Temporarily reduce `for` windows in a test namespace and trigger 5xx traffic plus log-pipeline interruptions to ensure Alertmanager routes fire with owner metadata.
5. **Governance validation**
   - Ensure retention policy alignment (30d app logs, 365d audit) and document any overrides.
   - Confirm `agent-observability` and `system-health` dashboards load from ConfigMap provisioning without manual import.

## Validation Checklist

- [ ] Traces, metrics, and logs share consistent `correlation_id` across services/mesh.
- [ ] Prometheus scraping shows OTEL, API, agents, Vector, Pyroscope targets `UP` with runtime/resource labels.
- [ ] Grafana dashboards render agent KPIs, system health, audit rates, and profiling with live data.
- [ ] Alerts remain green for healthy pipelines; smoke tests fire Alertmanager routes.
- [ ] Audit trail logs respect retention class/PII masking and `audit_events_total` increments with activity.
