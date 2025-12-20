output "aurora_global_endpoint" {
  value = aws_rds_global_cluster.aurora_global.endpoint
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.global_cdn.domain_name
}

output "primary_redis_endpoint" {
  value = aws_elasticache_replication_group.primary.primary_endpoint_address
}

output "route53_nameservers" {
  value = aws_route53_zone.main.name_servers
}
