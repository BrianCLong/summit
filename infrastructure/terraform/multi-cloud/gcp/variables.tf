# GCP Infrastructure Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "enable_vpn" {
  description = "Enable VPN gateway"
  type        = bool
  default     = false
}

variable "enable_interconnect" {
  description = "Enable Cloud Interconnect"
  type        = bool
  default     = false
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
}

variable "machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
}

variable "enable_filestore" {
  description = "Enable Filestore"
  type        = bool
  default     = true
}

variable "enable_gcs_backup" {
  description = "Enable GCS backup"
  type        = bool
  default     = true
}

variable "enable_secret_manager" {
  description = "Enable Secret Manager"
  type        = bool
  default     = true
}

variable "enable_kms" {
  description = "Enable Cloud KMS"
  type        = bool
  default     = true
}

variable "enable_cloud_monitoring" {
  description = "Enable Cloud Monitoring"
  type        = bool
  default     = true
}

variable "enable_spot_instances" {
  description = "Enable preemptible instances"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Resource labels"
  type        = map(string)
  default     = {}
}
