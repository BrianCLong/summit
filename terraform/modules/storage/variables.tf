# Storage Module Variables

variable "provider" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.provider)
    error_message = "Provider must be aws, gcp, or azure."
  }
}

variable "bucket_name" {
  description = "Name of the storage bucket"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "Cloud region"
  type        = string
}

# Storage configuration
variable "enable_versioning" {
  description = "Enable object versioning"
  type        = bool
  default     = true
}

variable "enable_worm" {
  description = "Enable WORM (Write Once Read Many) compliance"
  type        = bool
  default     = false
}

variable "worm_retention_days" {
  description = "Retention period in days for WORM"
  type        = number
  default     = 2555  # 7 years
}

variable "create_backup_bucket" {
  description = "Create a separate backup bucket"
  type        = bool
  default     = true
}

# Encryption
variable "kms_key_arn" {
  description = "KMS key ARN/ID for encryption"
  type        = string
  default     = ""
}

# Provider-specific
variable "resource_group_name" {
  description = "Resource group name (Azure only)"
  type        = string
  default     = ""
}

# Lifecycle rules
variable "lifecycle_rules" {
  description = "Lifecycle rules for object management"
  type = list(object({
    id               = string
    enabled          = bool
    transition_days  = number
    storage_class    = string
    expiration_days  = number
  }))
  default = [
    {
      id              = "archive-old-objects"
      enabled         = true
      transition_days = 90
      storage_class   = "GLACIER"
      expiration_days = 365
    }
  ]
}

# Tags
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
