# Monitoring & Alerting

- Install kube-prometheus-stack with `helm/monitoring/values.yaml`.
- ServiceMonitors are enabled via chart values for services.
- Alerts:
  - P95 latency > 1s for 10m
  - Error rate > 2% for 10m
- Grafana: dashboards stored via values; add custom JSON as needed.
- Alertmanager: wire Slack webhook via secret and values.
