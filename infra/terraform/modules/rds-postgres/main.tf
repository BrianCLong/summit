terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.55"
    }
  }
}

provider "aws" {
  region = var.region
}

module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.8"

  identifier = var.identifier

  engine            = "postgres"
  engine_version    = var.engine_version
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage

  db_name  = var.db_name
  username = var.username
  password = var.password
  port     = 5432

  vpc_security_group_ids = var.security_group_ids
  subnet_ids              = var.subnet_ids

  backup_window           = "03:00-06:00"
  backup_retention_period = 7

  publicly_accessible = false
  multi_az            = true
  storage_encrypted   = true
}

output "db_address" {
  value = module.db.db_instance_address
}

output "db_arn" {
  value = module.db.db_instance_arn
}

