# Kubernetes Dashboard Setup for ML Engine & Disclosure Packager

This guide covers how to deploy the new Grafana dashboards, Prometheus scrape targets, and alerting rules for the ML engine and disclosure packager services inside Kubernetes. Follow these steps after the cluster already has Prometheus, Grafana, Jaeger, and an OpenTelemetry Collector deployed.

## 1. Ensure Telemetry Annotations & Labels

Both services must expose Prometheus metrics on `/metrics` and include the following pod labels so that the provided scrape configs enrich time series with consistent dimensions:

| Label | Example | Purpose |
| --- | --- | --- |
| `app` | `ml-engine` / `disclosure-packager` | Target selection |
| `environment` | `prod` | Drives dashboard `$env` template |
| `model` (ML engine) | `ner-transformer` | Disaggregates model latency |
| `pipeline` (packager) | `urgent-disclosures` | Splits SLA and retry data |
| `version` | `2025.09.23` | Links to deployment wave |

Expose OTLP traces/metrics via the OpenTelemetry SDKs shipped with each service. Set `OTEL_EXPORTER_OTLP_ENDPOINT` to the cluster collector and enable Jaeger exporter in the collector pipeline so that trace IDs match dashboard links.

## 2. Prometheus Scrape Configuration

Merge `ops/prometheus/prometheus.yml` into your Prometheus config map. The new jobs rely on pod discovery:

```yaml
scrape_configs:
  - job_name: ml-engine
    metrics_path: /metrics
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['ml-services']
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: ml-engine
      - source_labels: [__meta_kubernetes_pod_label_environment]
        target_label: env
      - source_labels: [__meta_kubernetes_pod_label_model]
        target_label: model
```

Repeat for the disclosure packager namespace (`compliance-services`). After reloading Prometheus, confirm the `ml_engine_*` and `disclosure_packager_*` metrics are present with the `env` label.

## 3. Deploy Grafana Dashboards

Create or update the Grafana dashboard config map mounted at `/var/lib/grafana/dashboards` with the JSON exports in `ops/grafana/dashboards/`:

- `ml-engine-observability.json`
- `disclosure-packager-observability.json`

If you use the provided provisioning file (`ops/grafana/provisioning/dashboards/dashboards.yml`), Grafana will automatically load the dashboards on restart. Validate that the Jaeger data source (`ops/grafana/provisioning/datasources/jaeger.yml`) is present so the trace panels can render.

## 4. Hook Up Alerting

Add the new SLO alerts from `ops/prometheus/prometheus-rule-slo.yaml` to your Prometheus rule files (or create a dedicated `ConfigMap`). The rules trigger when availability over a 15‑minute window drops below 99.9% for either service. Route `severity: page` alerts to on-call, and consider adding a notification template that links to the Grafana panels and Jaeger search UI.

## 5. Validate End-to-End Telemetry

1. Generate test traffic against the ML engine and disclosure packager.
2. Confirm metrics appear in Prometheus (`up{job="ml-engine"}` == 1).
3. Open the Grafana dashboards and ensure latency, retries, and resource panels respond.
4. Use the embedded Jaeger panels to trace sample requests end-to-end; verify spans carry `service.name` consistent with the dashboards.
5. Temporarily stop a pod to ensure the 99.9% uptime alerts fire and recover.

Following these steps keeps inference performance, error budgets, and compliance packaging workflows observable with shared SLO context across metrics and traces.
