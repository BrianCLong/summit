locals {
  alert_topic_arn = var.create_sns_topic ? aws_sns_topic.alerts[0].arn : var.alert_topic_arn
}

resource "aws_sns_topic" "alerts" {
  count = var.create_sns_topic ? 1 : 0
  name  = "${var.dashboard_name}-alerts"

  tags = var.tags
}

resource "aws_cloudwatch_dashboard" "this" {
  dashboard_name = var.dashboard_name
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric",
        width  = 12,
        height = 6,
        properties = {
          metrics = [
            [var.metrics_namespace, "signer_signatures_total", "service", "signer", { "stat" : "Sum" }],
            [".", "signer_validation_errors_total", ".", ".", { "stat" : "Sum" }]
          ],
          view   = "timeSeries",
          region = var.region,
          title  = "Signer throughput vs validation errors"
        }
      },
      {
        type   = "metric",
        width  = 12,
        height = 6,
        properties = {
          metrics = [
            [var.metrics_namespace, "opa_bundle_downloads_total", "service", "policy-loader", { "stat" : "Sum" }],
            [".", "opa_bundle_signatures_failed_total", ".", ".", { "stat" : "Sum" }]
          ],
          view   = "timeSeries",
          region = var.region,
          title  = "Policy bundle health"
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "signer_latency" {
  alarm_name          = "${var.dashboard_name}-signer-latency"
  namespace           = var.metrics_namespace
  metric_name         = "signer_validation_latency_p95_seconds"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanThreshold"
  alarm_description   = "Signer validation p95 latency exceeded 1s"
  treat_missing_data  = "missing"

  alarm_actions = local.alert_topic_arn != "" ? [local.alert_topic_arn] : []

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "policy_staleness" {
  alarm_name          = "${var.dashboard_name}-policy-staleness"
  namespace           = var.metrics_namespace
  metric_name         = "opa_bundle_last_success_age_seconds"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1800
  comparison_operator = "GreaterThanThreshold"
  alarm_description   = "Policy bundles are stale beyond 30 minutes"
  treat_missing_data  = "breaching"

  alarm_actions = local.alert_topic_arn != "" ? [local.alert_topic_arn] : []

  tags = var.tags
}
