# --- Cost Governance ---

resource "aws_budgets_budget" "cost_limit" {
  name              = "summit-monthly-limit"
  budget_type       = "COST"
  limit_amount      = "500"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2023-01-01_00:00"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["admin@topicality.co"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["admin@topicality.co"]
  }
}
