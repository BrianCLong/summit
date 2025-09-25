terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.region
}

# VPC (simple)
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

# Public subnets
resource "aws_subnet" "public" {
  for_each          = toset(var.public_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${replace(each.value, ".", "-")}"
  }
}

# Private subnets
resource "aws_subnet" "private" {
  for_each          = toset(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  map_public_ip_on_launch = false

  tags = {
    Name = "${var.project}-private-${replace(each.value, ".", "-")}"
  }
}

# ECR for images
resource "aws_ecr_repository" "core" {
  name                 = "${var.project}/core"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# EKS Node Groups (On-Demand and Spot)
# This assumes an EKS cluster is already created (e.g., via eksctl)
# and its name is available as var.cluster_name.

resource "aws_eks_node_group" "on_demand" {
  cluster_name    = var.cluster_name
  node_group_name = "${var.project}-on-demand"
  node_role_arn   = var.node_role_arn
  subnet_ids      = aws_subnet.private[*].id # Deploy to private subnets

  instance_types = ["m5.large"] # On-demand instances
  capacity_type  = "ON_DEMAND"

  scaling_config {
    desired_size = 2
    min_size     = 1
    max_size     = 5
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    "nodegroup-type" = "on-demand"
  }

  tags = {
    "eks:cluster-name" = var.cluster_name
    "eks:nodegroup-name" = "${var.project}-on-demand"
  }

  depends_on = [
    aws_vpc.main,
    aws_subnet.private,
  ]
}

resource "aws_eks_node_group" "spot" {
  cluster_name    = var.cluster_name
  node_group_name = "${var.project}-spot"
  node_role_arn   = var.node_role_arn
  subnet_ids      = aws_subnet.private[*].id # Deploy to private subnets

  instance_types = ["m5.large", "m5a.large", "m5d.large"] # Mix of spot instances
  capacity_type  = "SPOT"

  scaling_config {
    desired_size = 1
    min_size     = 0
    max_size     = 3
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    "nodegroup-type" = "spot"
  }

  tags = {
    "eks:cluster-name" = var.cluster_name
    "eks:nodegroup-name" = "${var.project}-spot"
  }

  depends_on = [
    aws_vpc.main,
    aws_subnet.private,
  ]
}


# OIDC will be configured by EKS (via eksctl), but we keep outputs for reference

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = [for s in aws_subnet.public : s.id]
}

output "private_subnet_ids" {
  value = [for s in aws_subnet.private : s.id]
}

output "ecr_repo" {
  value = aws_ecr_repository.core.repository_url
}
