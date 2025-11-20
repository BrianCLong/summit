# Variables for VPC Endpoints module

variable "vpc_id" {
  description = "The ID of the VPC where endpoints will be created"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

# S3 Gateway Endpoint
variable "enable_s3_endpoint" {
  description = "Enable S3 Gateway Endpoint (FREE - eliminates NAT charges for S3)"
  type        = bool
  default     = true
}

variable "s3_endpoint_policy" {
  description = "Optional policy to restrict S3 endpoint access"
  type        = string
  default     = null
}

# ECR Interface Endpoints
variable "enable_ecr_endpoints" {
  description = "Enable ECR Interface Endpoints (reduces NAT charges for container image pulls)"
  type        = bool
  default     = true
}

# Secrets Manager
variable "enable_secretsmanager_endpoint" {
  description = "Enable Secrets Manager Interface Endpoint"
  type        = bool
  default     = false
}

# Systems Manager
variable "enable_ssm_endpoints" {
  description = "Enable SSM Interface Endpoints (ssm, ssmmessages, ec2messages)"
  type        = bool
  default     = false
}

# CloudWatch Logs
variable "enable_logs_endpoint" {
  description = "Enable CloudWatch Logs Interface Endpoint"
  type        = bool
  default     = false
}

# STS
variable "enable_sts_endpoint" {
  description = "Enable STS Interface Endpoint (for IAM role assumption)"
  type        = bool
  default     = false
}

# ECS
variable "enable_ecs_endpoints" {
  description = "Enable ECS Interface Endpoints (ecs, ecs-agent, ecs-telemetry)"
  type        = bool
  default     = false
}
