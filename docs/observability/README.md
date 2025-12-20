# Observability Runbook

This guide describes the production-grade observability stack for Summit/IntelGraph and how to validate deployments. The stack standardizes traces, metrics, logs, continuous profiling, and audit evidence with correlation IDs propagated across the mesh.

## Architecture Overview
- **Telemetry Ingestion**: OpenTelemetry Collector receives OTLP traffic from services and the service mesh, enriches resources with Kubernetes and correlation metadata, and exports to Tempo (traces), Prometheus (metrics), Loki (logs), and Grafana Cloud OTLP.
- **Logging Pipeline**: Vector agents run as a DaemonSet to collect application, mesh, and audit logs, inject correlation/trace IDs, and fan out to Loki and the collector for log-to-trace correlation.
- **Metrics Scraping**: Prometheus Operator scrapes applications, workers, and mesh sidecars via ServiceMonitor and PodMonitor objects, with additional rules for SLOs and agent KPIs.
- **Dashboards & Alerts**: Grafana dashboards (ConfigMaps) visualize system health, mesh traffic, agent cost/success, and profiling signals. PrometheusRule resources capture critical failure, saturation, error-rate, and SLO breach alerts.
- **Profiling**: Pyroscope in the `profiling` namespace plus Parca agents for node-level capture; exported to the collector and Pyroscope UI.
- **Audit Trail**: Kubernetes audit policy feeds Vector and durable PVC storage with retention and alerting.

## Components
- `infra/observability/otel-collector.yaml`: OTLP receiver, Prometheus self-scrape, correlation/mesh enrichment processors, Tempo/Loki/Prometheus/Grafana Cloud exporters, and health/pprof endpoints.
- `infra/observability/vector-agent.yaml`: Vector config and DaemonSet for structured logging with correlation IDs and OTLP fanout; includes RBAC and tolerations for node coverage.
- `infra/observability/service-monitors.yaml`: Prometheus Operator monitors for collector, agent runtime/API/scheduler, workers, and Istio Envoy sidecars with correlation relabeling.
- `infra/observability/prometheus-rules.yaml`: Alerting rules covering mesh SLOs, agent failure/cost, collector health, node pressure, TLS expiry, and profiling stalls.
- `infra/observability/pyroscope.yaml`: Profiling namespace with Pyroscope Deployment/Service/ServiceMonitor and Parca agent DaemonSet shipping OTLP to the collector and profiles to Pyroscope.
- `infra/observability/audit-pipeline.yaml`: Audit policy ConfigMap, retention CronJob, PVC, and alert rules for ingestion backlog and storage pressure.
- `infra/observability/grafana-dashboards/agent-kpis.json`: Grafana dashboard ConfigMap payload for agent KPIs, mesh latency, and resource consumption.

## Rollout Steps
1. **Namespaces & CRDs**: Ensure Prometheus Operator CRDs exist; apply `profiling` and `observability` namespaces if absent.
2. **Collector & Logging**: Deploy `otel-collector.yaml` and `vector-agent.yaml`. Validate collector health endpoint `/health` and ensure Vector connects to `/var/log`.
3. **Metrics Scraping**: Apply `service-monitors.yaml`. Confirm ServiceMonitor/PodMonitor objects are discovered by Prometheus (`/service-discovery`).
4. **Profiling**: Apply `pyroscope.yaml` to create Pyroscope + Parca agent; verify profiles appear in the UI and OTLP spans include `profiling.experimental.cpu` attributes.
5. **Audit Trail**: Apply `audit-pipeline.yaml`; mount `audit-policy.yaml` into the API server flags; confirm audit logs land in the PVC and Loki stream.
6. **Dashboards**: Mount Grafana dashboard ConfigMaps (via Grafana sidecar). Import `agent-kpis.json` and wire Prometheus datasource UID `prometheus`.
7. **Alerts**: Deploy `prometheus-rules.yaml` and `audit-pipeline.yaml` rules. Verify Alertmanager receives alerts by forcing a controlled failure (e.g., throttle API).

## Validation Checklist
- OTLP traces, metrics, and logs show identical `correlation_id`, `trace_id`, and `span_id` values from mesh headers.
- Service mesh Envoy metrics appear with `namespace`/`pod` labels; p99 latency < 750ms under normal load.
- Agent metrics (`agent_runs_total`, `agent_cost_tokens_total`) scrape successfully from API/runtime/worker endpoints.
- Grafana dashboard panels render without missing data; legend shows mesh workloads and agent components.
- Alerting rules fire in staging via synthetic load tests and resolve automatically.
- Pyroscope UI displays profiles per service and node; Parca agent reports OTLP to collector without errors.
- Audit logs retained for 30 days; retention CronJob deletes files older than the window and alerts if storage >85%.

## Governance & PII Handling
- Audit policy excludes event spam and restricts to metadata for read-only verbs; write operations capture request/response for forensics.
- Ensure Vector/Loki tenants apply log access controls; restrict Grafana dashboards and profiling UI via SSO.
- Apply data-retention policies: 30 days for audit logs, 14 days for logs/traces by default, 7 days for profiling unless business requires more.

## Runbooks
- **Collector Export Failures**: Check `otelcol_exporter_send_failed_spans` alert; inspect `otel-collector` logs, verify Tempo/Loki endpoints, and fall back to debug exporter.
- **Agent SLO Breach**: When `MeshSloBreach` or `AgentFailureRateHigh` fires, correlate trace IDs from logs with Tempo spans, identify failing dependency, and scale or rollback.
- **Audit Pipeline Backlog**: Validate `vector` sink connectivity, ensure PVC has space, and rerun the `audit-retention` CronJob if needed.
- **Profiling Gaps**: If `ProfileIngestionStalled` fires, restart Parca DaemonSet pods on affected nodes and check Pyroscope ingestion metrics.

## Continuous Improvement
- Automate synthetic journeys using `docs/observability/synthetic-dashboard.md` load patterns to validate dashboards and alerts after every deploy.
- Consider enabling tail-based sampling in the collector for high-volume traces and exporting RED metrics via exemplar correlation.
