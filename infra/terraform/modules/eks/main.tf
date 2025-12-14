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

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "~> 20.8"
  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id  = var.vpc_id
  subnet_ids = var.subnet_ids

  eks_managed_node_groups = merge(
    {
      default = {
        instance_types = var.instance_types
        min_size       = var.min_size
        max_size       = var.max_size
        desired_size   = var.desired_size
      }
    },
    var.enable_spot ? {
      spot = {
        instance_types = var.spot_instance_types
        capacity_type  = "SPOT"
        min_size       = var.spot_min_size
        max_size       = var.spot_max_size
        desired_size   = var.spot_desired_size
      }
    } : {}
  )
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  value = module.eks.cluster_security_group_id
}
