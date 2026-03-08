# Summit GA Quickstart: EKS + Mocks
# Purpose: Rapidly deploy a demo-ready Summit environment

provider "aws" {
  region = "us-east-1"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "summit-ga-demo"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      min_size     = 3
      max_size     = 5
      desired_size = 3
      instance_types = ["t3.xlarge"]
    }
  }
}

# Mocks for Demo Data
resource "kubernetes_config_map" "summit_mocks" {
  metadata {
    name      = "summit-demo-mocks"
    namespace = "default"
  }

  data = {
    "drift_scenario_01.json" = jsonencode({
      id = "drift-01"
      type = "unauthorized_change"
      severity = "critical"
      resource = "sg-0abc123"
    })
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "summit-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
}
