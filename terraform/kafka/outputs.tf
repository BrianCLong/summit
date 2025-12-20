output "bootstrap_brokers" {
  description = "TLS connection host:port pairs"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
}

output "schema_registry_arn" {
  description = "ARN of the Glue Schema Registry"
  value       = aws_glue_registry.main.arn
}
