
terraform { required_providers { aws = { source = "hashicorp/aws", version = ">= 5.0" } } }
provider "aws" { region = var.region }

resource "aws_kms_key" "pg" { description = "KMS key for Aurora Postgres" enable_key_rotation = true }

resource "aws_rds_cluster" "pg" {
  engine                       = "aurora-postgresql"
  engine_version               = var.engine_version
  database_name                = var.database_name
  master_username              = var.master_username
  master_password              = var.master_password
  storage_encrypted            = true
  kms_key_id                   = aws_kms_key.pg.arn
  backup_retention_period      = 14
  deletion_protection          = true
  copy_tags_to_snapshot        = true
  vpc_security_group_ids       = [var.security_group_id]
  db_subnet_group_name         = var.db_subnet_group
  serverlessv2_scaling_configuration { min_capacity = 1 max_capacity = 16 }
}

resource "aws_rds_cluster_instance" "pg_instances" {
  count               = 2
  cluster_identifier  = aws_rds_cluster.pg.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.pg.engine
  engine_version      = aws_rds_cluster.pg.engine_version
  publicly_accessible = false
  monitoring_interval = 60
  auto_minor_version_upgrade = true
}
