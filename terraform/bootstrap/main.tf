# Day-0 Bootstrap: Stand up the Dev Environment
# This uses the existing modules to provision a cluster.

provider "aws" {
  region = "us-west-2"
}

terraform {
  backend "s3" {
    bucket = "companyos-terraform-state"
    key    = "bootstrap/dev/terraform.tfstate"
    region = "us-west-2"
  }
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "intelgraph-dev-vpc"
  cidr   = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
}

module "eks_cluster" {
  source = "../../modules/eks"

  cluster_name    = "intelgraph-dev"
  cluster_version = "1.29"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  # Node Groups
  node_groups = {
    generic = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1
      instance_type    = "t3.medium"
    }
  }
}

module "monitoring" {
  source = "../../modules/monitoring"

  cluster_name = module.eks_cluster.cluster_name
  enable_prometheus = true
  enable_grafana    = true
  enable_loki       = true
}

module "database" {
  source = "../../modules/rds-postgres"

  identifier = "intelgraph-dev-db"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  db_name    = "companyos_dev"
  username   = "postgres"
  password   = var.db_password
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
