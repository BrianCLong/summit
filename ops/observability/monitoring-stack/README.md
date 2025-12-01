# Monitoring Stack Kustomization

This package codifies the production-ready Prometheus + Grafana + OpenTelemetry + ELK + Loki stack used by IntelGraph.

## Contents

- `kustomization.yaml` – orchestrates configmaps, secrets, and deployments (Prometheus, Grafana, Alertmanager, Jaeger, OTel Collector, Pyroscope, Blackbox Exporter, Filebeat, Loki, Elasticsearch, Kibana).
- `monitoring-workloads.yaml` – Kubernetes manifests for the observability control plane.
- `alertmanager.yml` – base routing configuration (wired to Slack by default).

## Key Capabilities

- **Metrics & Dashboards**: Prometheus with SLA/SLO rules, Grafana dashboards (platform + reliability views), Pyroscope profiling charts.
- **Tracing**: OpenTelemetry Collector with OTLP ingress and export to Jaeger (OTLP gRPC) and Prometheus remote write for metrics.
- **Logging**: Filebeat → Elasticsearch/Kibana for log aggregation plus Loki for lightweight, queryable logs.
- **Alerting**: Alertmanager with SLA/SLO/error-budget alerts, OTel pipeline error detection, profiling ingestion stalls, and Elasticsearch health checks.
- **Health & SLA Monitoring**: Blackbox exporter probes service health endpoints; Prometheus rules compute 30d availability and emit SLA breaches.
- **Performance Profiling**: Pyroscope captures continuous profiles; OTel Collector exposes pprof + health endpoints for debugging.

## Usage

```bash
kubectl apply -k ops/observability/monitoring-stack
```

Override targets or credentials by editing the config maps or setting environment variables before applying. Grafana provisioning loads dashboards from the `grafana-dashboards` configmap. Prometheus rules are bundled from `ops/prometheus` (including SLA coverage) and reload automatically via `/-/reload`.
