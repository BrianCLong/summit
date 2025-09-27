terraform {
  required_version = ">= 1.4.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_prometheus_workspace" "this" {
  alias = var.amp_workspace_alias
  tags  = var.default_tags
}

resource "aws_grafana_workspace" "this" {
  account_access_type = var.grafana_account_access
  authentication_providers = ["SAML", "AWS_SSO"]
  name                = "summit-observability"
  data_sources        = ["PROMETHEUS", "CLOUDWATCH", "ATHENA"]
  notification_destinations = ["SNS"]
  tags                = var.default_tags
}

resource "aws_sns_topic" "slo_pages" {
  name = "summit-slo-pages"
  tags = var.default_tags
}

resource "aws_sns_topic_subscription" "pagerduty" {
  topic_arn = aws_sns_topic.slo_pages.arn
  protocol  = "https"
  endpoint  = var.pagerduty_webhook_url
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "summit-api-p99-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "p99_latency_ms"
  namespace           = "Summit/API"
  period              = 60
  statistic           = "Average"
  threshold           = 450
  alarm_description   = "Alert when API p99 latency exceeds 450ms for 3 minutes"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.slo_pages.arn]
  ok_actions          = [aws_sns_topic.slo_pages.arn]
  dimensions = {
    Service = "api-gateway"
    Environment = var.environment
  }
  tags = var.default_tags
}

resource "aws_cloudwatch_metric_alarm" "ingest_backlog" {
  alarm_name          = "summit-ingest-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "lag_seconds_p95"
  namespace           = "Summit/Ingest"
  period              = 60
  statistic           = "Average"
  threshold           = 120
  alarm_description   = "Alert when ingest lag p95 exceeds 120 seconds"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.slo_pages.arn]
  ok_actions          = [aws_sns_topic.slo_pages.arn]
  dimensions = {
    Pipeline = "default"
    Environment = var.environment
  }
  tags = var.default_tags
}

resource "aws_sns_topic" "cost_guardrail" {
  name = "summit-cost-guardrail"
  tags = var.default_tags
}

resource "aws_sns_topic_subscription" "cost_webhook" {
  topic_arn             = aws_sns_topic.cost_guardrail.arn
  protocol              = "https"
  endpoint              = var.github_issue_webhook_url
  endpoint_auto_confirms = true
}

resource "aws_budgets_budget" "platform" {
  name              = "summit-platform-monthly"
  budget_type       = "COST"
  limit_amount      = tostring(var.monthly_platform_budget)
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_time_period_start

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_guardrail.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 85
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_guardrail.arn]
  }

  tags = var.default_tags
}

resource "aws_budgets_budget" "llm" {
  name              = "summit-llm-monthly"
  budget_type       = "COST"
  limit_amount      = tostring(var.monthly_llm_budget)
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_time_period_start

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_guardrail.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 85
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_guardrail.arn]
  }

  tags = var.default_tags
}

