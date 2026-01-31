provider "aws" {
  region = var.aws_region
}

terraform {
  backend "s3" {
    bucket         = "summit-terraform-state-prod"
    key            = "platform/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "summit-terraform-locks"
    encrypt        = true
  }
}

locals {
  cluster_name = "summit-prod-eks"
  environment  = "prod"
}

# --- Networking ---
# Utilizing official AWS module for robustness
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "summit-prod-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # Cost optimization for now
  enable_vpn_gateway = false

  tags = {
    Environment = local.environment
    Terraform   = "true"
  }
}

# --- Compute (EKS) ---
# Utilizing official AWS module for robustness
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.21.0"

  cluster_name    = local.cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true
  enable_irsa                    = true # Enable OIDC for Service Accounts

  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  eks_managed_node_group_defaults = {
    instance_types = ["t3.medium"]
  }

  eks_managed_node_groups = {
    general = {
      min_size      = 2
      max_size      = 10
      desired_size  = 3
      capacity_type = "SPOT" # Cost Optimization (~70% savings)

      instance_types = ["t3.medium", "t3.large"] # Diversify for Spot availability
    }
    neo4j = {
      min_size       = 3
      max_size       = 3
      desired_size   = 3
      instance_types = ["r6i.large"]
      labels = {
        workload = "neo4j"
      }
      taints = {
        dedicated = {
          key    = "workload"
          value  = "neo4j"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  tags = {
    Environment = local.environment
    Terraform   = "true"
  }
}

# --- Database (Aurora Postgres Serverless v2) ---

module "aurora" {

  source  = "terraform-aws-modules/rds-aurora/aws"

  version = "9.1.0"



  name           = "summit-prod-db"

  engine         = "aurora-postgresql"

  engine_version = "16.1"

  master_username = "summit_admin"

  database_name   = "summit_prod"



  vpc_id               = module.vpc.vpc_id

  subnets              = module.vpc.private_subnets

  security_group_rules = {

    ex1_ingress = {

      source_node_security_group = true

      description                = "Allow EKS nodes to connect to Aurora"

    }

  }



  serverlessv2_scaling_configuration = {

    min_capacity = 0.5

    max_capacity = 4.0

  }



  instance_class = "db.serverless"

  instances = {

    one = {}

    two = {}

  }



  # --- Data Safety (PITR) ---

  backup_retention_period = 30

  preferred_backup_window = "02:00-04:00"

  deletion_protection     = true

  storage_encrypted       = true

}

# --- Caching (Redis) ---
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "summit-prod-redis"
  description                = "Redis cluster for Summit Prod"
  node_type                  = "cache.t4g.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7.cluster.on"
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  automatic_failover_enabled = true
  multi_az_enabled           = true

  num_node_groups         = 2
  replicas_per_node_group = 1

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "summit-prod-redis-subnet"
  subnet_ids = module.vpc.private_subnets
}

# --- Backup & DR (AWS Backup) ---
resource "aws_backup_vault" "prod_vault" {
  name = "summit-prod-backup-vault"
}

resource "aws_backup_plan" "prod_backup_plan" {
  name = "summit-prod-backup-plan"

  rule {
    rule_name         = "DailyBackups"
    target_vault_name = aws_backup_vault.prod_vault.name
    schedule          = "cron(0 5 * * ? *)"

    lifecycle {
      delete_after = 30
    }
  }

  rule {
    rule_name         = "MonthlyBackups"
    target_vault_name = aws_backup_vault.prod_vault.name
    schedule          = "cron(0 5 1 * ? *)"

    lifecycle {
      delete_after = 365
      cold_storage_after = 30
    }
  }
}

resource "aws_backup_selection" "prod_backup_selection" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "summit-prod-backup-selection"
  plan_id      = aws_backup_plan.prod_backup_plan.id

  resources = [
    module.aurora.cluster_arn
  ]
}

resource "aws_iam_role" "backup_role" {
  name               = "summit-prod-backup-role"
  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["sts:AssumeRole"],
      "Effect": "allow",
      "Principal": {
        "Service": ["backup.amazonaws.com"]
      }
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "backup_role_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup_role.name
}

# --- Outputs ---
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

# --- Storage (Neo4j Backups) ---
module "neo4j_backups" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket = "summit-prod-neo4j-backups-${module.vpc.vpc_id}" # Unique name
  acl    = "private"

  control_object_ownership = true
  object_ownership         = "ObjectWriter"

  versioning = {
    enabled = true
  }

  lifecycle_rule = [
    {
      id      = "archive-old-backups"
      enabled = true
      expiration = {
        days = 30
      }
    }
  ]
}

output "backup_bucket_name" {
  value = module.neo4j_backups.s3_bucket_id
}
