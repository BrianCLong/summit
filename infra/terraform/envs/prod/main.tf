terraform {
  required_version = ">= 1.5.0"
  backend "s3" {}
}

provider "aws" {
  region = var.region
}

module "eks" {
  source          = "../../modules/eks"
  region          = var.region
  cluster_name    = "intelgraph-prod"
  cluster_version = var.cluster_version
  vpc_id          = var.vpc_id
  subnet_ids      = var.subnet_ids
  instance_types  = var.instance_types
  min_size        = 3
  max_size        = 12
  desired_size    = 6
}

module "rds" {
  source            = "../../modules/rds-postgres"
  region            = var.region
  identifier        = "intelgraph-prod"
  engine_version    = var.db_engine_version
  instance_class    = var.db_instance_class
  allocated_storage = 200
  db_name           = var.db_name
  username          = var.db_username
  password          = var.db_password
  security_group_ids = var.db_security_group_ids
  subnet_ids         = var.db_subnet_ids
}

module "backups" {
  source        = "../../modules/s3-backups"
  region        = var.region
  bucket_name   = var.backup_bucket_name
  expiration_days = 90
}

output "cluster_name" { value = module.eks.cluster_name }
output "db_address" { value = module.rds.db_address }
output "backup_bucket" { value = module.backups.bucket_name }

