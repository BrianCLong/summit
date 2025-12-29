# =============================================================================
# Summit v4.0 - Terraform Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "database_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = module.vpc.database_subnet_group_name
}

# -----------------------------------------------------------------------------
# EKS Outputs
# -----------------------------------------------------------------------------

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for EKS"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL for the EKS cluster"
  value       = module.eks.cluster_oidc_issuer_url
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "node_security_group_id" {
  description = "Security group ID attached to the EKS nodes"
  value       = module.eks.node_security_group_id
}

output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# -----------------------------------------------------------------------------
# RDS Outputs
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.summit.endpoint
  sensitive   = true
}

output "rds_address" {
  description = "RDS instance address (hostname)"
  value       = aws_db_instance.summit.address
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.summit.port
}

output "rds_database_name" {
  description = "Name of the default database"
  value       = aws_db_instance.summit.db_name
}

output "rds_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.summit.arn
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs
# -----------------------------------------------------------------------------

output "redis_primary_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.summit.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint address"
  value       = aws_elasticache_replication_group.summit.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.summit.port
}

output "redis_arn" {
  description = "ARN of the Redis replication group"
  value       = aws_elasticache_replication_group.summit.arn
}

# -----------------------------------------------------------------------------
# CloudHSM Outputs
# -----------------------------------------------------------------------------

output "cloudhsm_cluster_id" {
  description = "ID of the CloudHSM cluster"
  value       = var.enable_cloudhsm ? aws_cloudhsm_v2_cluster.summit[0].cluster_id : null
}

output "cloudhsm_cluster_state" {
  description = "State of the CloudHSM cluster"
  value       = var.enable_cloudhsm ? aws_cloudhsm_v2_cluster.summit[0].cluster_state : null
}

# -----------------------------------------------------------------------------
# Load Balancer Outputs
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.summit.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.summit.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.summit.arn
}

# -----------------------------------------------------------------------------
# ACM Outputs
# -----------------------------------------------------------------------------

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.summit.arn
}

output "certificate_domain_name" {
  description = "Domain name of the ACM certificate"
  value       = aws_acm_certificate.summit.domain_name
}

# -----------------------------------------------------------------------------
# Route53 Outputs
# -----------------------------------------------------------------------------

output "api_domain_name" {
  description = "Full API domain name"
  value       = "${var.api_subdomain}.${var.domain_name}"
}

output "api_url" {
  description = "Full API URL"
  value       = "https://${var.api_subdomain}.${var.domain_name}"
}

# -----------------------------------------------------------------------------
# S3 Outputs
# -----------------------------------------------------------------------------

output "audit_bucket_name" {
  description = "Name of the audit logs S3 bucket"
  value       = aws_s3_bucket.audit_logs.id
}

output "audit_bucket_arn" {
  description = "ARN of the audit logs S3 bucket"
  value       = aws_s3_bucket.audit_logs.arn
}

# -----------------------------------------------------------------------------
# Secrets Manager Outputs
# -----------------------------------------------------------------------------

output "database_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.database_credentials.arn
}

output "redis_secret_arn" {
  description = "ARN of the Redis auth token secret"
  value       = aws_secretsmanager_secret.redis_auth.arn
}

output "api_keys_secret_arn" {
  description = "ARN of the API keys secret"
  value       = aws_secretsmanager_secret.api_keys.arn
}

# -----------------------------------------------------------------------------
# Security Groups Outputs
# -----------------------------------------------------------------------------

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}

output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

# -----------------------------------------------------------------------------
# Connection Strings (for application configuration)
# -----------------------------------------------------------------------------

output "database_connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_db_instance.summit.address
    port     = aws_db_instance.summit.port
    database = aws_db_instance.summit.db_name
    ssl      = true
  }
  sensitive = true
}

output "redis_connection_info" {
  description = "Redis connection information"
  value = {
    primary_endpoint = aws_elasticache_replication_group.summit.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.summit.reader_endpoint_address
    port            = aws_elasticache_replication_group.summit.port
    tls             = true
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# Deployment Information
# -----------------------------------------------------------------------------

output "deployment_summary" {
  description = "Summary of deployment information"
  value = {
    environment       = var.environment
    cluster_name      = module.eks.cluster_name
    api_url           = "https://${var.api_subdomain}.${var.domain_name}"
    aws_region        = var.aws_region
    kubernetes_version = var.kubernetes_version
    cloudhsm_enabled  = var.enable_cloudhsm
  }
}
