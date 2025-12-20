output "dashboard_name" {
  description = "Name of the CloudWatch dashboard."
  value       = aws_cloudwatch_dashboard.this.dashboard_name
}

output "alert_topic_arn" {
  description = "ARN of the SNS topic used for alerts."
  value       = local.alert_topic_arn
}
