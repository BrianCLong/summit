# Prometheus Monitoring Pack

This folder ships the curated rules and base configuration for the IntelGraph observability stack.

## Files

- `prometheus.yml` – opinionated scrape configuration covering Maestro services, OTEL collector, Jaeger, Loki, and Kubernetes pods. Includes alertmanager wiring and references all rule files in this directory.
- `prometheus-rule-slo.yaml` – legacy platform SLO alerts (graph latency and HTTP error burn rate).
- `rules-business.yaml` – business KPI recordings (signups, API calls, revenue) with anomaly detection, SLA/SLO alerts, and capacity planning projections.

## Usage

1. Mount `prometheus.yml` into the Prometheus server (or Prometheus Operator `Prometheus` CR) and ensure the volume contains both rule files.
2. Provide DNS entries or service names for the static targets (e.g. `maestro-api`, `maestro-worker`, `jaeger`). Adjust to match your cluster topology.
3. Deploy the alertmanager service defined in the monitoring stack kustomization to receive SLA/SLO violations.
4. Optional: enable Kubernetes pod scraping by labelling workloads with `prometheus.io/scrape: "true"` and the optional `prometheus.io/port` / `prometheus.io/path` annotations.

## Expected Alerts

- `BusinessSignupAnomaly` / `ApiCallVolumeAnomaly` – z-score anomalies above the configured sigma thresholds.
- `RevenueRunRateShortfall` – annual run rate below $1M for 30 minutes.
- `ApiLatencySLOBreach`, `ApiErrorBudgetBurn` – core API SLI degradations.
- `CapacityCPUForecastCritical`, `CapacityMemoryForecastCritical` – predictive capacity thresholds breached within 14 days.

Tune the thresholds by editing the rule files and reloading Prometheus via `/-/reload`.
