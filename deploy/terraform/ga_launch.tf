
resource "grafana_dashboard" "ga_core" {
  config_json = file("${path.module}/dashboards/ga_core.json")
}

resource "prometheus_alert_rule" "latency" {
  name = "detector_p95_latency"
  expr = "histogram_quantile(0.95, sum(rate(detector_latency_bucket[5m])) by (le)) > 0.15"
  for  = "5m"
  labels = { severity = "page" }
}
