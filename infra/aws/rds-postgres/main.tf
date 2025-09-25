variable "db_name" { type = string, default = "companyos" }
variable "db_username" { type = string, default = "postgres" }
variable "db_password" { type = string, sensitive = true }
variable "db_instance_class" { type = string, default = "db.t3.micro" }
variable "db_allocated_storage" { type = number, default = 20 }
variable "db_engine_version" { type = string, default = "14.7" }
variable "db_port" { type = number, default = 5432 }
variable "vpc_security_group_ids" { type = list(string) }
variable "db_subnet_group_name" { type = string }
variable "region" { type = string }
variable "kms_key_id" { type = string, description = "KMS Key ID for RDS encryption" }

resource "aws_db_parameter_group" "companyos_pg" {
  name   = "companyos-pg-14"
  family = "postgres14"

  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries slower than 1 second
  }
}

resource "aws_db_instance" "companyos_db" {
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = var.db_engine_version
  instance_class       = var.db_instance_class
  name                 = var.db_name
  username             = var.db_username
  password             = var.db_password
  port                 = var.db_port
  vpc_security_group_ids = var.vpc_security_group_ids
  db_subnet_group_name = var.db_subnet_group_name
  parameter_group_name = aws_db_parameter_group.companyos_pg.name

  skip_final_snapshot  = false
  final_snapshot_identifier = "companyos-final-snapshot"

  # Backup and PITR
  backup_retention_period = 7
  backup_window           = "03:00-05:00"
  apply_immediately       = false
  multi_az                = false # Set to true for production HA

  # Encryption
  storage_encrypted = true
  kms_key_id        = var.kms_key_id

  # Monitoring
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Name = "companyos-postgres"
    Environment = "${var.region}"
  }
}

output "db_instance_endpoint" {
  value = aws_db_instance.companyos_db.address
}

output "db_instance_port" {
  value = aws_db_instance.companyos_db.port
}

output "db_instance_name" {
  value = aws_db_instance.companyos_db.name
}

output "db_instance_username" {
  value = aws_db_instance.companyos_db.username
}
