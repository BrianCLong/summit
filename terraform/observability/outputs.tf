output "prometheus_workspace_id" {
  value       = aws_prometheus_workspace.this.id
  description = "AMP workspace identifier"
}

output "prometheus_remote_write_endpoint" {
  value       = aws_prometheus_workspace.this.prometheus_endpoint
  description = "Remote write endpoint for collectors"
}

output "grafana_workspace_endpoint" {
  value       = aws_grafana_workspace.this.endpoint
  description = "Grafana workspace endpoint"
}

output "slo_pager_topic_arn" {
  value       = aws_sns_topic.slo_pages.arn
  description = "SNS topic for paging on SLO breaches"
}

output "cost_guardrail_topic_arn" {
  value       = aws_sns_topic.cost_guardrail.arn
  description = "SNS topic triggered by AWS Budgets cost guardrails"
}
