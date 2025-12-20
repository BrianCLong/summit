variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "region" {
  description = "AWS Region"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet CIDRs"
  type        = list(string)
}

variable "public_subnets" {
  description = "List of public subnet CIDRs"
  type        = list(string)
}

variable "intra_subnets" {
  description = "List of intra subnet CIDRs"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks which can access the Amazon EKS public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "system_node_instance_types" {
  description = "Instance types for system node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "app_node_instance_types" {
  description = "Instance types for application node group"
  type        = list(string)
  default     = ["t3.large", "m5.large"]
}

variable "ml_node_instance_types" {
  description = "Instance types for ML node group"
  type        = list(string)
  default     = ["g4dn.xlarge"]
}

variable "postgres_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "postgres_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "opensearch_instance_type" {
  description = "OpenSearch instance type"
  type        = string
  default     = "t3.small.search"
}

variable "opensearch_volume_size" {
  description = "OpenSearch EBS volume size"
  type        = number
  default     = 10
}

variable "owner" {
  description = "Owner tag value"
  type        = string
  default     = "DevOps"
}

# Multi-Region Variables
variable "is_primary_region" {
  description = "Whether this is the primary region"
  type        = bool
  default     = true
}

variable "source_db_identifier" {
  description = "Identifier of the source DB for Read Replica creation (required if !is_primary_region)"
  type        = string
  default     = null
}

variable "global_replication_group_id" {
  description = "ID of the Global Replication Group for Redis (required for multi-region)"
  type        = string
  default     = null
}

variable "primary_auth_token" {
  description = "Auth token from the primary Redis cluster (required for secondary region)"
  type        = string
  default     = null
  sensitive   = true
}

variable "ingress_domain" {
  description = "The DNS name of the Ingress Load Balancer (simulated for now)"
  type        = string
  default     = "ingress-alb.internal"
}
