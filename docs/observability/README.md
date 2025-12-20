# Observability Runbook and Validation Guide

This guide outlines the production-ready observability stack for Summit/IntelGraph and how to validate traces, metrics, logs, profiles, and audit trails end-to-end.

## Architecture highlights
- **OpenTelemetry first:** Services emit OTLP traces/metrics/logs with correlation IDs; collector enriches with Kubernetes metadata and exports to Tempo, Prometheus, and Loki (`infra/observability/otel-collector.yaml`).
- **Mesh-aware scraping:** Prometheus scrapes the collector, Istio sidecars, and agent runtimes via `ServiceMonitor`/`PodMonitor` objects in `infra/observability/prometheus-scrape.yaml`.
- **Structured logging:** Vector daemonset config (`infra/observability/vector-pipeline.yaml`) enriches Kubernetes logs, ensures correlation propagation, and forwards to Loki.
- **Dashboards:** Grafana dashboards for health, agent KPIs, and mesh traffic are provisioned via ConfigMaps in `infra/observability/grafana/configmaps.yaml`.
- **Alerting + SLOs:** Critical alerting rules for latency, errors, saturation, agent failures/cost, mesh error budgets, collector pressure, and audit ingestion live in `infra/observability/prometheus-rules.yaml`.
- **Continuous profiling:** Pyroscope deployment and agent config are defined in `infra/observability/profiling.yaml` for CPU profiling with mesh/environment tags.
- **Audit governance:** Policies and validation steps are documented in `docs/observability/audit-trail.md` with incident playbook `docs/observability/runbooks/audit-integrity.md`.

## Validation steps (pre/post-deploy)
1. **Collector + mesh flow**
   - Apply collector and scrape configs: `kubectl apply -f infra/observability/otel-collector.yaml -f infra/observability/prometheus-scrape.yaml`.
   - Send a test span: `otel-cli span -u http://otel-collector.observability:4318/v1/traces --service-name smoke --name smoke-span --attribute correlation.id=$(uuidgen)` and confirm it appears in Tempo with matching Loki log entries.
2. **Metrics + scraping**
   - Confirm Prometheus targets: `kubectl -n observability port-forward svc/prometheus-k8s 9090` then check `/targets` for `otel-collector`, `service-mesh-sidecars`, and `agent-runtime` endpoints.
   - Validate agent KPIs: query `histogram_quantile(0.95, sum(rate(agent_runtime_seconds_bucket[5m])) by (le, agent))` returns values.
3. **Logging pipeline**
   - Deploy Vector config: `kubectl apply -f infra/observability/vector-pipeline.yaml`.
   - Generate a request with header `x-correlation-id`; verify Loki logs include `correlation_id` label and match Tempo trace ID.
4. **Dashboards**
   - Apply Grafana ConfigMaps: `kubectl apply -f infra/observability/grafana/configmaps.yaml` and reload dashboards.
   - Check panels:
     - System Health: API latency/error rate and collector throughput.
     - Agent KPIs: runtime p95, cost burn rate, success/failure, pod resource usage.
     - Mesh Traffic: request volume, success rate, p95 latency.
5. **Alerting**
   - Load rules: `kubectl apply -f infra/observability/prometheus-rules.yaml`.
   - Run synthetic load to trigger warning thresholds (e.g., CPU saturation) and confirm Alertmanager receives notifications.
6. **Profiling**
   - Deploy Pyroscope: `kubectl apply -f infra/observability/profiling.yaml`.
   - Point services to `PYROSCOPE_SERVER=http://pyroscope.profiling:4040` and ensure profiles appear tagged with `mesh=istio`.
7. **Audit trail**
   - Follow `docs/observability/audit-trail.md` to verify ingestion, retention, PII redaction, and dashboards.
   - If ingestion stalls or integrity checks fail, execute the audit integrity runbook.

## Runbooks and ownership
- Latency, error-budget, and saturation runbooks live in `docs/observability/runbooks/`.
- Audit integrity incidents: security on-call is incident commander; observability SRE assists with telemetry pipelines.
- Profiling tuning: platform performance team owns Pyroscope retention and sampling changes.

## Governance and retention
- Correlation IDs are mandatory for all service-to-service calls and propagated via Istio headers; collectors enforce insertion when absent.
- Logs retain 30d in Loki; metrics keep 15d in Prometheus; traces keep 14d in Tempo; profiles retain 14d in Pyroscope.
- PII handling follows `docs/governance/PII_TAGS.md`; redaction happens at the logging layer before export.
