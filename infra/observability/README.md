# Observability and Monitoring Stack

This package ships production-ready manifests for metrics, logs, traces, profiling, and governance observability across Summit services.

## Components

- **OpenTelemetry Collector (`otel-collector.yaml`)**: receives OTLP traces/metrics/logs from services and forwards to Prometheus, Tempo, and Loki/Vector sinks with correlation IDs preserved.
- **Prometheus Operator artifacts**: `service-monitors.yaml` for scraping app/agent metrics; `prometheus-rules.yaml` for SLO-aligned alerts (latency, errors, cost, correlation coverage, mesh health, HPA thrashing, profiling stalls).
- **Grafana**: dashboards under `grafana-dashboards/` for exec/ops/trust views; add dashboards here and mount via ConfigMaps.
- **Vector pipeline (`vector.yaml`)**: structured logging with correlation IDs and trace/span IDs for cross-system navigation.
- **Continuous profiling (`profiling.yaml`)**: Pyroscope/Parca agents and scrape endpoints for CPU/memory flamegraphs.
- **Audit and compliance**: audit trail retention and integrity monitoring through dedicated alert rules and logs routing.

## Deployment order

1. Install the Prometheus Operator CRDs (or kube-prometheus-stack) and create the `observability` namespace.
2. Apply `otel-collector.yaml` to centralize telemetry ingress from services (ensure mesh sidecars forward OTLP traffic).
3. Apply `service-monitors.yaml` and `prometheus-rules.yaml` to begin scraping and alerting.
4. Deploy `vector.yaml` to forward structured logs to your log store (e.g., Loki, Elastic, or S3+Athena).
5. Roll out `profiling.yaml` for Pyroscope/Parca; validate ingestion via the Grafana profiling datasource.
6. Mount dashboards from `grafana-dashboards/` (or `grafana/` provisioning manifests) into Grafana and enable Alertmanager routing.

## Key metrics and dashboards

- **Agent runtime**: `agent_requests_total`, `agent_request_latency_seconds`, `agent_runtime_cost_total` scraped via the agent PodMonitor for runtime, latency, and cost visibility.
- **Mesh health**: `istio_requests_total`, `envoy_cluster_upstream_cx_active` for service-to-service reliability and saturation.
- **Resource & autoscaling**: CPU/memory utilization, `kube_horizontalpodautoscaler_status_current_replicas`, and saturation alerts for thrashing or exhaustion.
- **Audit/compliance**: alert rules for missing correlation IDs, certificate expiry, and audit ingestion gaps.

## Alerting and runbooks

PrometheusRule entries annotate severity and expected operator actions. Pair alerts with runbooks in `infra/runbooks/` and wire to Alertmanager receivers.

## Security and privacy

- Enforce TLS on all scrape endpoints (mesh mTLS via Istio). If exposing Prometheus/Grafana, protect with ingress authN/Z and network policies.
- Avoid embedding secrets in manifests; rely on External Secrets Operator for credentials (e.g., Grafana admin password).
- Respect PII handling guidance from `docs/governance/CONSTITUTION.md` when capturing logs and traces.
