# Cluster Module Variables

variable "provider" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.provider)
    error_message = "Provider must be aws, gcp, or azure."
  }
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
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

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

# Network configuration
variable "vpc_id" {
  description = "VPC ID where cluster will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for cluster nodes"
  type        = list(string)
}

variable "cluster_ipv4_cidr" {
  description = "CIDR block for cluster pods (GCP only)"
  type        = string
  default     = ""
}

variable "services_ipv4_cidr" {
  description = "CIDR block for cluster services (GCP only)"
  type        = string
  default     = ""
}

# Node configuration
variable "node_instance_types" {
  description = "Instance types for cluster nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_count" {
  description = "Minimum number of nodes"
  type        = number
  default     = 2
}

variable "node_max_count" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_desired_count" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

# Security
variable "enable_public_access" {
  description = "Enable public access to cluster API"
  type        = bool
  default     = false
}

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

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = ""
}

# Add-ons
variable "install_external_secrets" {
  description = "Install External Secrets Operator"
  type        = bool
  default     = true
}

variable "install_metrics_server" {
  description = "Install Metrics Server"
  type        = bool
  default     = true
}

# Tags
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
