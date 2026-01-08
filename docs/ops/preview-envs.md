# Preview Env Metrics & Dashboards

- If using Prometheus Operator: install `kube-prometheus-stack` and ensure `serviceMonitor.enabled=true` in values.
- Otherwise, Service annotations will be scraped by the legacy Prometheus config.
- Grafana sidecar will auto-load any ConfigMaps labeled `grafana_dashboard=1`.
