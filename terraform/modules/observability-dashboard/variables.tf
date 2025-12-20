variable "dashboard_name" {
  description = "Name of the CloudWatch dashboard."
  type        = string
  default     = "intelgraph-observability"
}

variable "region" {
  description = "AWS region for dashboard metrics."
  type        = string
}

variable "metrics_namespace" {
  description = "CloudWatch metrics namespace emitted by signer/policy components."
  type        = string
  default     = "intelgraph"
}

variable "create_sns_topic" {
  description = "Whether to create a dedicated SNS topic for alerts."
  type        = bool
  default     = true
}

variable "alert_topic_arn" {
  description = "Existing SNS topic ARN to reuse for alerts (when create_sns_topic is false)."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to created resources."
  type        = map(string)
  default     = {}
}
