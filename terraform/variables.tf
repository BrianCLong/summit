variable "region" {
  description = "AWS region for provisioning infrastructure."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment identifier (e.g., dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "bundle_bucket_name" {
  description = "Name of the bucket that stores signer policy bundles and dashboards."
  type        = string
  default     = ""
}

variable "metrics_namespace" {
  description = "CloudWatch metrics namespace emitted by signer and policy components."
  type        = string
  default     = "intelgraph"
}

variable "tags" {
  description = "Common tags applied to all infrastructure resources."
  type        = map(string)
  default     = {}
}
