# Multi-Cloud Infrastructure Variables

# General Configuration
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "summit"
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}

# Terraform State Configuration
variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
}

variable "terraform_lock_table" {
  description = "DynamoDB table for state locking"
  type        = string
}

variable "primary_region" {
  description = "Primary region for state backend"
  type        = string
  default     = "us-east-1"
}

# AWS Configuration
variable "aws_primary_region" {
  description = "AWS primary region"
  type        = string
  default     = "us-east-1"
}

variable "aws_secondary_region" {
  description = "AWS secondary region for DR"
  type        = string
  default     = "us-west-2"
}

variable "aws_vpc_cidr" {
  description = "CIDR block for AWS VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aws_node_instance_types" {
  description = "EC2 instance types for EKS nodes"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge"]
}

# Azure Configuration
variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

variable "azure_location" {
  description = "Azure primary location"
  type        = string
  default     = "eastus"
}

variable "azure_vnet_cidr" {
  description = "CIDR block for Azure VNet"
  type        = string
  default     = "10.1.0.0/16"
}

variable "azure_node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

# GCP Configuration
variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_primary_region" {
  description = "GCP primary region"
  type        = string
  default     = "us-central1"
}

variable "gcp_secondary_region" {
  description = "GCP secondary region for DR"
  type        = string
  default     = "us-west1"
}

variable "gcp_vpc_cidr" {
  description = "CIDR block for GCP VPC"
  type        = string
  default     = "10.2.0.0/16"
}

variable "gcp_machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
  default     = "n1-standard-4"
}

# Kubernetes Configuration
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
  default     = 3
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "desired_nodes" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

# Hybrid Connectivity
variable "enable_vpn" {
  description = "Enable VPN connectivity"
  type        = bool
  default     = true
}

variable "enable_direct_connect" {
  description = "Enable AWS Direct Connect"
  type        = bool
  default     = false
}

variable "enable_express_route" {
  description = "Enable Azure ExpressRoute"
  type        = bool
  default     = false
}

variable "enable_interconnect" {
  description = "Enable GCP Cloud Interconnect"
  type        = bool
  default     = false
}

variable "enable_cross_cloud_peering" {
  description = "Enable cross-cloud VPC peering"
  type        = bool
  default     = true
}

variable "enable_sd_wan" {
  description = "Enable SD-WAN integration"
  type        = bool
  default     = false
}

variable "vpn_shared_secret" {
  description = "Shared secret for VPN connections"
  type        = string
  sensitive   = true
}

variable "on_premise_cidrs" {
  description = "On-premise network CIDR blocks"
  type        = list(string)
  default     = []
}

# Service Mesh
variable "enable_multi_cluster_mesh" {
  description = "Enable multi-cluster service mesh"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost savings"
  type        = bool
  default     = true
}

variable "cost_allocation_tags" {
  description = "Tags for cost allocation"
  type        = map(string)
  default     = {}
}

variable "monthly_budget" {
  description = "Monthly budget in USD"
  type        = number
  default     = 10000
}

variable "cost_alert_email" {
  description = "Email for cost alerts"
  type        = string
}

# Disaster Recovery
variable "enable_cross_cloud_dr" {
  description = "Enable cross-cloud disaster recovery"
  type        = bool
  default     = false
}

variable "rto_minutes" {
  description = "Recovery Time Objective in minutes"
  type        = number
  default     = 60
}

variable "rpo_minutes" {
  description = "Recovery Point Objective in minutes"
  type        = number
  default     = 15
}

# Monitoring
variable "alert_endpoints" {
  description = "Alert notification endpoints"
  type        = list(string)
  default     = []
}
