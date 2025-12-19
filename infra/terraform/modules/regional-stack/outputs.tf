output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "Kubernetes Cluster Name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "rds_id" {
  description = "The ID of the RDS instance"
  value       = module.rds.db_instance_identifier
}

output "rds_arn" {
  description = "The ARN of the RDS instance"
  value       = module.rds.db_instance_arn
}

output "redis_endpoint" {
  description = "The address of the Redis replication group"
  value       = module.redis.replication_group_primary_endpoint_address
}

output "opensearch_endpoint" {
  description = "Domain-specific endpoint for OpenSearch"
  value       = module.opensearch.domain_endpoint
}

output "ingress_endpoint" {
  description = "The DNS endpoint for the Application Ingress"
  value       = var.ingress_domain
}
