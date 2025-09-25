output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance."
  value       = aws_db_instance.companyos_db.address
}

output "db_instance_port" {
  description = "The port for the RDS instance."
  value       = aws_db_instance.companyos_db.port
}

output "db_instance_name" {
  description = "The name of the database."
  value       = aws_db_instance.companyos_db.name
}

output "db_instance_username" {
  description = "The username for the database."
  value       = aws_db_instance.companyos_db.username
}
