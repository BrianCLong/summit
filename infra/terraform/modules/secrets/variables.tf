# Secrets Module Variables

variable "provider" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.provider)
    error_message = "Provider must be aws, gcp, or azure."
  }
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "Cloud region"
  type        = string
}

# Secrets configuration
variable "secrets" {
  description = "Map of secrets to create"
  type = map(object({
    description      = string
    data            = map(string)
    rotation_enabled = bool
    rotation_days   = number
  }))
  default = {}
  sensitive = true
}

# Encryption
variable "kms_key_arn" {
  description = "KMS key ARN/ID for encryption"
  type        = string
  default     = ""
}

# Rotation
variable "rotation_lambda_arn" {
  description = "Lambda ARN for secret rotation (AWS only)"
  type        = string
  default     = ""
}

# External Secrets Operator
variable "install_external_secrets" {
  description = "Install External Secrets Operator"
  type        = bool
  default     = true
}

variable "external_secrets_version" {
  description = "External Secrets Operator version"
  type        = string
  default     = "0.9.9"
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace for External Secrets"
  type        = string
  default     = "default"
}

# Provider-specific
variable "resource_group_name" {
  description = "Resource group name (Azure only)"
  type        = string
  default     = ""
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
  default     = ""
}

variable "azure_service_principal_id" {
  description = "Azure service principal object ID"
  type        = string
  default     = ""
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = ""
}

variable "service_account_email" {
  description = "Service account email for GCP"
  type        = string
  default     = ""
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = ""
}

# Examples
variable "create_example" {
  description = "Create example ExternalSecret manifest"
  type        = bool
  default     = false
}

# Tags
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
