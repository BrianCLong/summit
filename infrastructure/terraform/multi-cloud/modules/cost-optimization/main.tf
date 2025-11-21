# Cost Optimization Module
# Implements tagging, budgets, and cost monitoring

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "azure_subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "required_tags" {
  description = "Required tags for all resources"
  type        = list(string)
  default     = ["Environment", "CostCenter", "Project", "Owner"]
}

variable "cost_allocation_tags" {
  description = "Tags for cost allocation"
  type        = map(string)
  default     = {}
}

variable "enable_rightsizing" {
  description = "Enable rightsizing recommendations"
  type        = bool
  default     = true
}

variable "enable_spot_instances" {
  description = "Enable spot instance usage"
  type        = bool
  default     = true
}

variable "enable_savings_plans" {
  description = "Enable savings plans tracking"
  type        = bool
  default     = true
}

variable "budget_amount" {
  description = "Monthly budget in USD"
  type        = number
  default     = 10000
}

variable "budget_threshold" {
  description = "Budget alert threshold percentage"
  type        = number
  default     = 80
}

variable "alert_email" {
  description = "Email for cost alerts"
  type        = string
}

# AWS Cost Anomaly Detection
resource "aws_ce_anomaly_monitor" "main" {
  name              = "summit-cost-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "main" {
  name      = "summit-cost-anomaly-subscription"
  frequency = "DAILY"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.main.arn
  ]

  subscriber {
    type    = "EMAIL"
    address = var.alert_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_PERCENTAGE"
      match_options = ["GREATER_THAN_OR_EQUAL"]
      values        = ["10"]
    }
  }
}

# AWS Budget
resource "aws_budgets_budget" "monthly" {
  name              = "summit-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.budget_amount
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())

  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$Summit"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.budget_threshold
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

# AWS Cost and Usage Report
resource "aws_cur_report_definition" "main" {
  report_name                = "summit-cost-report"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cost_reports.id
  s3_region                  = "us-east-1"
  s3_prefix                  = "cost-reports"
  report_versioning          = "OVERWRITE_REPORT"
  refresh_closed_reports     = true
}

resource "aws_s3_bucket" "cost_reports" {
  bucket = "summit-cost-reports-${var.aws_account_id}"
}

resource "aws_s3_bucket_policy" "cost_reports" {
  bucket = aws_s3_bucket.cost_reports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCUR"
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = [
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy"
        ]
        Resource = aws_s3_bucket.cost_reports.arn
        Condition = {
          StringEquals = {
            "aws:SourceArn"    = "arn:aws:cur:us-east-1:${var.aws_account_id}:definition/*"
            "aws:SourceAccount" = var.aws_account_id
          }
        }
      },
      {
        Sid    = "AllowCURPut"
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cost_reports.arn}/*"
        Condition = {
          StringEquals = {
            "aws:SourceArn"    = "arn:aws:cur:us-east-1:${var.aws_account_id}:definition/*"
            "aws:SourceAccount" = var.aws_account_id
          }
        }
      }
    ]
  })
}

# AWS Compute Optimizer (for rightsizing)
resource "aws_compute_optimizer_enrollment_status" "main" {
  count = var.enable_rightsizing ? 1 : 0

  status = "Active"
}

# Cost Allocation Tags (enable in AWS)
resource "aws_ce_cost_allocation_tag" "required" {
  for_each = toset(var.required_tags)

  tag_key = each.value
  status  = "Active"
}

# Azure Budget
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "summit-monthly-budget"
  subscription_id = "/subscriptions/${var.azure_subscription_id}"
  amount          = var.budget_amount
  time_grain      = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01T00:00:00Z", timestamp())
  }

  notification {
    enabled        = true
    threshold      = var.budget_threshold
    operator       = "GreaterThan"
    threshold_type = "Forecasted"

    contact_emails = [var.alert_email]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = [var.alert_email]
  }
}

# GCP Budget
resource "google_billing_budget" "monthly" {
  billing_account = data.google_billing_account.account.id
  display_name    = "summit-monthly-budget"

  budget_filter {
    projects = ["projects/${var.gcp_project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = var.budget_amount
    }
  }

  threshold_rules {
    threshold_percent = var.budget_threshold / 100
    spend_basis       = "FORECASTED_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Summit Cost Alerts"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

# Data sources
data "google_billing_account" "account" {
  display_name = "Summit Billing Account"
  open         = true
}

# Outputs
output "aws_budget_id" {
  value = aws_budgets_budget.monthly.id
}

output "aws_cost_report_bucket" {
  value = aws_s3_bucket.cost_reports.id
}

output "azure_budget_id" {
  value = azurerm_consumption_budget_subscription.monthly.id
}

output "gcp_budget_id" {
  value = google_billing_budget.monthly.id
}
