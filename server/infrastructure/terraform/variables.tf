# =============================================================================
# Summit v4.0 - Terraform Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "summit"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Summit"
    Version     = "4.0.0"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway (cost optimization)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# EKS Configuration
# -----------------------------------------------------------------------------

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "summit-production"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.28"
}

variable "cluster_endpoint_public_access" {
  description = "Enable public access to EKS API endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Enable private access to EKS API endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "CIDRs allowed to access EKS API endpoint publicly"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production
}

# Node Group - Application
variable "app_node_instance_types" {
  description = "Instance types for application node group"
  type        = list(string)
  default     = ["m6i.xlarge"]
}

variable "app_node_min_size" {
  description = "Minimum size of application node group"
  type        = number
  default     = 3
}

variable "app_node_max_size" {
  description = "Maximum size of application node group"
  type        = number
  default     = 20
}

variable "app_node_desired_size" {
  description = "Desired size of application node group"
  type        = number
  default     = 5
}

# Node Group - AI Workloads
variable "ai_node_instance_types" {
  description = "Instance types for AI workload node group"
  type        = list(string)
  default     = ["m6i.2xlarge"]
}

variable "ai_node_min_size" {
  description = "Minimum size of AI workload node group"
  type        = number
  default     = 2
}

variable "ai_node_max_size" {
  description = "Maximum size of AI workload node group"
  type        = number
  default     = 10
}

variable "ai_node_desired_size" {
  description = "Desired size of AI workload node group"
  type        = number
  default     = 3
}

# Node Group - Database
variable "db_node_instance_types" {
  description = "Instance types for database node group"
  type        = list(string)
  default     = ["r6i.xlarge"]
}

variable "db_node_min_size" {
  description = "Minimum size of database node group"
  type        = number
  default     = 2
}

variable "db_node_max_size" {
  description = "Maximum size of database node group"
  type        = number
  default     = 5
}

variable "db_node_desired_size" {
  description = "Desired size of database node group"
  type        = number
  default     = 3
}

# -----------------------------------------------------------------------------
# RDS Configuration
# -----------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 1000
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "db_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "db_performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "db_performance_insights_retention" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

# -----------------------------------------------------------------------------
# ElastiCache Configuration
# -----------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in replication group"
  type        = number
  default     = 3
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_automatic_failover_enabled" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

variable "redis_at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "redis_transit_encryption_enabled" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 7
}

# -----------------------------------------------------------------------------
# CloudHSM Configuration
# -----------------------------------------------------------------------------

variable "enable_cloudhsm" {
  description = "Enable CloudHSM for Zero-Trust security"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "summit.io"
}

variable "api_subdomain" {
  description = "API subdomain"
  type        = string
  default     = "api"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""  # Must be provided
}

# -----------------------------------------------------------------------------
# S3 Configuration
# -----------------------------------------------------------------------------

variable "audit_bucket_retention_days" {
  description = "Days to retain audit logs in S3"
  type        = number
  default     = 2555  # 7 years for compliance
}

variable "enable_s3_versioning" {
  description = "Enable S3 versioning for audit bucket"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Monitoring Configuration
# -----------------------------------------------------------------------------

variable "enable_container_insights" {
  description = "Enable Container Insights for EKS"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 90
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------

variable "enable_secrets_rotation" {
  description = "Enable automatic secrets rotation"
  type        = bool
  default     = true
}

variable "secrets_rotation_days" {
  description = "Days between secrets rotation"
  type        = number
  default     = 30
}
