locals {
  tags = {
    Service     = "signer"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket" "policy_bundles" {
  bucket = var.policy_bundle_bucket
  tags   = local.tags
}

resource "aws_s3_object" "bundle_manifest" {
  bucket = aws_s3_bucket.policy_bundles.id
  key    = "${var.signer_name}/bundle-manifest.json"
  content = jsonencode({
    bundle   = var.signer_name,
    source   = var.policy_bundle_source,
    signer   = var.signer_name,
    checksum = var.policy_bundle_checksum,
  })
  content_type = "application/json"
  etag         = md5(jsonencode(var.policy_bundle_checksum))
}

resource "aws_s3_bucket" "dashboards" {
  bucket = var.dashboard_bucket
  tags   = merge(local.tags, { Purpose = "grafana-dashboards" })
}

resource "aws_s3_object" "signer_dashboard" {
  bucket       = aws_s3_bucket.dashboards.id
  key          = "dashboards/signer-service.json"
  content      = var.signer_dashboard_json
  content_type = "application/json"
  depends_on   = [aws_s3_bucket.dashboards]
}

resource "aws_cloudwatch_log_group" "signer" {
  name              = "/intelgraph/${var.environment}/signer"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_metric_alarm" "failure_rate" {
  count                     = var.alert_topic_arn == "" ? 0 : 1
  alarm_name                = "${var.environment}-signer-attestation-failure"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = 1
  metric_name               = "signer_attestation_failure_rate"
  namespace                 = "IntelGraph/Signer"
  period                    = 60
  statistic                 = "Average"
  threshold                 = 0.01
  alarm_description         = "Signer attestation failure rate over 1%"
  alarm_actions             = [var.alert_topic_arn]
  insufficient_data_actions = []
  ok_actions                = [var.alert_topic_arn]
  tags                      = local.tags
}
