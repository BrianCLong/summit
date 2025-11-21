terraform {
  required_version = ">= 1.5.0"
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 2.5"
    }
    prometheus = {
      source  = "Prometheus/prometheus"
      version = "~> 1.1"
    }
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.11"
    }
  }
}

locals {
  service_team = "platform-sre"
}

resource "grafana_folder" "sre" {
  title = "Platform SRE"
}

resource "grafana_dashboard" "platform_overview" {
  provider = grafana
  folder   = grafana_folder.sre.uid
  config_json = file("${path.module}/../../../ops/grafana/dashboards/intelgraph-platform-operations.json")
}

resource "prometheus_alert_rule_group" "slo_burn" {
  name       = "intelgraph-platform-slo"
  namespace  = "monitoring"
  interval   = "30s"
  rule {
    alert       = "APIErrorBudgetFastBurn"
    expr        = "(1 - (sum(rate(http_requests_total{service=\"intelgraph-api\",status!~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"intelgraph-api\"}[5m])))) / 0.001 > 14.4"
    for         = "5m"
    annotations = { summary = "API error budget burning too fast" }
    labels = {
      severity          = "critical"
      pagerduty_service = pagerduty_service.integration.service
    }
  }
}

resource "pagerduty_service" "integration" {
  name = "IntelGraph Platform"
  auto_resolve_timeout = 14400
  acknowledgement_timeout = 1800
  escalation_policy = pagerduty_escalation_policy.sre.id
}

resource "pagerduty_escalation_policy" "sre" {
  name = "Platform SRE Escalation"
  num_loops = 2
  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "user_reference"
      id   = var.primary_oncall_user_id
    }
  }
}

variable "primary_oncall_user_id" {
  type        = string
  description = "PagerDuty user ID for the primary platform SRE"
}
