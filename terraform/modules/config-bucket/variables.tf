variable "bucket_name" {
  description = "Unique name for the bucket that stores policy bundles and dashboards."
  type        = string
}

variable "kms_key_arn" {
  description = "Optional KMS key ARN used for server-side encryption."
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "Whether to force destroy the bucket (including objects)."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to the bucket."
  type        = map(string)
  default     = {}
}
