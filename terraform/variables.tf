variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "dev"
}

variable "policy_bundle_bucket" {
  type        = string
  description = "S3 bucket for policy bundles"
  default     = "intelgraph-policy-bundles"
}

variable "policy_bundle_source" {
  type        = string
  description = "Source URI for the promoted bundle"
  default     = "s3://opa-bundles/maestro/v4/maestro-policy-bundle.tgz"
}

variable "policy_bundle_checksum" {
  type        = string
  description = "Checksum for the promoted bundle"
  default     = ""
}

variable "dashboard_bucket" {
  type        = string
  description = "S3 bucket for Grafana dashboards"
  default     = "intelgraph-grafana"
}

variable "alert_topic_arn" {
  type        = string
  description = "SNS topic for alerts"
  default     = ""
}
