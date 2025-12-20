terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  tags = merge(var.tags, {
    "env"   = "dr",
    "owner" = "intelgraph",
  })
}

resource "aws_s3_bucket" "dr_backups" {
  bucket = "${var.prefix}-dr-backups"
  force_destroy = false
  versioning {
    enabled = true
  }
  object_lock_configuration {
    object_lock_enabled = "Enabled"
    rule {
      default_retention {
        mode = "COMPLIANCE"
        days = 30
      }
    }
  }
  tags = local.tags
}

resource "aws_eks_cluster" "dr" {
  name     = "${var.prefix}-dr"
  role_arn = var.cluster_role_arn
  version  = var.kubernetes_version
  vpc_config {
    subnet_ids = var.subnet_ids
  }
  tags = local.tags
}

output "dr_bucket" {
  value = aws_s3_bucket.dr_backups.id
}

output "cluster_name" {
  value = aws_eks_cluster.dr.name
}
