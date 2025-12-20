output "dashboard_names" {
  value = [for d in aws_cloudwatch_dashboard.this : d.dashboard_name]
}
