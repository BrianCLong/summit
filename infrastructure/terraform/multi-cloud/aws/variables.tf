# AWS Infrastructure Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "enable_vpn" {
  description = "Enable VPN gateway"
  type        = bool
  default     = false
}

variable "enable_direct_connect" {
  description = "Enable Direct Connect"
  type        = bool
  default     = false
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
}

variable "node_instance_types" {
  description = "Instance types for EKS nodes"
  type        = list(string)
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
}

variable "desired_nodes" {
  description = "Desired number of nodes"
  type        = number
}

variable "enable_efs" {
  description = "Enable EFS"
  type        = bool
  default     = true
}

variable "enable_s3_backup" {
  description = "Enable S3 backup bucket"
  type        = bool
  default     = true
}

variable "enable_secrets_manager" {
  description = "Enable Secrets Manager"
  type        = bool
  default     = true
}

variable "enable_kms" {
  description = "Enable KMS encryption"
  type        = bool
  default     = true
}

variable "enable_cloudwatch" {
  description = "Enable CloudWatch logging"
  type        = bool
  default     = true
}

variable "enable_spot_instances" {
  description = "Enable spot instances"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
