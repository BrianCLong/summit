variable "region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Deployment environment tag"
  type        = string
  default     = "production"
}

variable "amp_workspace_alias" {
  description = "Alias for Amazon Managed Prometheus workspace"
  type        = string
}

variable "grafana_account_access" {
  description = "Grafana workspace account access type"
  type        = string
  default     = "CURRENT_ACCOUNT"
}

variable "pagerduty_webhook_url" {
  description = "PagerDuty Events API v2 HTTPS integration URL"
  type        = string
}

variable "github_issue_webhook_url" {
  description = "Internal webhook that opens GitHub issues for cost overruns"
  type        = string
}

variable "monthly_platform_budget" {
  description = "Monthly cost cap for the entire Summit platform"
  type        = number
}

variable "monthly_llm_budget" {
  description = "Monthly cost cap for LLM usage"
  type        = number
}

variable "budget_time_period_start" {
  description = "ISO8601 start date for AWS Budgets"
  type        = string
  default     = "2025-01-01_00:00"
}

variable "default_tags" {
  description = "Default tags applied to all resources"
  type        = map(string)
  default = {
    Project     = "Summit"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
