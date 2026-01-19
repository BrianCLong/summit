resource "aws_cloudwatch_dashboard" "main" {
  for_each = var.dashboards

  dashboard_name = each.key
  dashboard_body = each.value.body
}
