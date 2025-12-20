variable "environment" {
  description = "Deployment environment (dev/stage/prod)"
  type        = string
}

variable "signer_name" {
  description = "Identifier for the signer service"
  type        = string
}

variable "policy_bundle_bucket" {
  description = "S3 bucket used to store policy bundles"
  type        = string
}

variable "policy_bundle_source" {
  description = "URI for the published OPA bundle"
  type        = string
}

variable "policy_bundle_checksum" {
  description = "SHA-256 checksum for the OPA bundle"
  type        = string
}

variable "dashboard_bucket" {
  description = "S3 bucket storing Grafana dashboards"
  type        = string
}

variable "signer_dashboard_json" {
  description = "Serialized dashboard JSON for signer observability"
  type        = string
}

variable "alert_topic_arn" {
  description = "Optional SNS topic ARN for alerts"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Log retention in days for signer logs"
  type        = number
  default     = 14
}
