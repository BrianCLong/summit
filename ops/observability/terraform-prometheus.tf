terraform {
  required_version = ">= 1.4.0"
  required_providers {
    prometheus = {
      source  = "prometheus/prometheus"
      version = "~> 2.9"
    }
  }
}

provider "prometheus" {
  url   = var.prometheus_url
  auth  = {
    bearer_token = var.prometheus_bearer_token
  }
  tls_config {
    insecure_skip_verify = false
  }
}

resource "prometheus_alert_rule" "cloud_cost_budget" {
  name  = "cloud_cost_budget"
  rule_group {
    name     = "summit-slo-burn"
    interval = "1m"
    rule {
      alert       = "CloudCostBudgetBreach"
      expr        = "sum_over_time(cloud_cost_hourly_usd{team=\"sre-platform\"}[12h]) > (0.8 * 180 * 12)"
      for         = "15m"
      labels = {
        severity = "page"
        team     = "sre-platform"
      }
      annotations = {
        summary = "Cloud spend will exceed 80% of budget within 12h."
        runbook = "https://runbooks.summit.dev/cost-optimization"
      }
    }
  }
}

variable "prometheus_url" {
  type        = string
  description = "Prometheus base URL"
}

variable "prometheus_bearer_token" {
  type        = string
  description = "Bearer token for remote Prometheus API access"
  sensitive   = true
}
