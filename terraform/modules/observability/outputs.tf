output "dashboard_arns" {
  value = { for k, v in aws_cloudwatch_dashboard.main : k => v.dashboard_arn }
}
