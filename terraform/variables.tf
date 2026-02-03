variable "region" {
  description = "AWS region for deployments"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name used for tagging and naming"
  type        = string
  default     = "prod-canary"
}

variable "tags" {
  description = "Common tags applied to provisioned resources"
  type        = map(string)
  default = {
    Tenant    = "acme-corp"
    ManagedBy = "Terraform"
    Project   = "IntelGraph"
  }
}

variable "kms_keys" {
  description = "Map of KMS key configurations keyed by a friendly name"
  type = map(object({
    description             = optional(string)
    enable_key_rotation     = optional(bool, true)
    deletion_window_in_days = optional(number, 30)
    key_admin_arns          = optional(list(string), [])
    key_user_arns           = optional(list(string), [])
    aliases                 = optional(list(string), [])
    policy                  = optional(string)
  }))
  default = {}
}

variable "dashboards" {
  description = "Map of CloudWatch dashboards to manage"
  type = map(object({
    body = string
  }))
  default = {}
}
