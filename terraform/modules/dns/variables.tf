# DNS Module Variables

variable "provider" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.provider)
    error_message = "Provider must be aws, gcp, or azure."
  }
}

variable "domain_name" {
  description = "Primary domain name"
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

# Zone configuration
variable "create_zone" {
  description = "Create a new DNS zone"
  type        = bool
  default     = true
}

variable "existing_zone_id" {
  description = "Existing zone ID (if not creating new zone)"
  type        = string
  default     = ""
}

# DNS records
variable "dns_records" {
  description = "Map of DNS records to create"
  type = map(object({
    name    = string
    type    = string
    ttl     = number
    records = list(string)
  }))
  default = {}
}

# Certificate configuration
variable "create_certificate" {
  description = "Create SSL/TLS certificate"
  type        = bool
  default     = true
}

variable "san_domains" {
  description = "Subject Alternative Names for certificate"
  type        = list(string)
  default     = []
}

# cert-manager configuration
variable "enable_cert_manager" {
  description = "Enable cert-manager configuration"
  type        = bool
  default     = true
}

variable "acme_email" {
  description = "Email for ACME registration (Let's Encrypt)"
  type        = string
  default     = ""
}

# Provider-specific
variable "resource_group_name" {
  description = "Resource group name (Azure only)"
  type        = string
  default     = ""
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = ""
}

variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = ""
}

# Tags
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
