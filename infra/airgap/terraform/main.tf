# Air-Gapped Deployment Infrastructure for Summit IntelGraph
# Provides secure, isolated deployment with defense-in-depth controls
#
# This module provisions infrastructure for air-gapped/disconnected environments
# with strict network isolation, removable media controls, and SNMP monitoring

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  name_prefix = "intelgraph-airgap"
  common_tags = {
    Environment  = var.environment
    Project      = "IntelGraph"
    Component    = "AirGappedDeployment"
    ManagedBy    = "Terraform"
    SecurityZone = "isolated"
    Compliance   = "FedRAMP-High"
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# VPC for Air-Gapped Environment (No Internet Gateway)
# -----------------------------------------------------------------------------

module "airgap_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnets
  # No public subnets - true air-gapped design
  public_subnets = []

  # Disable NAT and Internet Gateways for air-gapped isolation
  enable_nat_gateway   = false
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs for security monitoring
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  tags = merge(local.common_tags, {
    NetworkType = "air-gapped"
  })
}

# -----------------------------------------------------------------------------
# Security Groups for Air-Gapped Network Segments
# -----------------------------------------------------------------------------

# Data Transfer Zone - for scanning stations
resource "aws_security_group" "data_transfer_zone" {
  name        = "${local.name_prefix}-data-transfer-zone"
  description = "Security group for data transfer/scanning zone"
  vpc_id      = module.airgap_vpc.vpc_id

  # Only allow internal traffic from scanning stations
  ingress {
    description = "HTTPS from scanning stations"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.scanning_station_cidr]
  }

  ingress {
    description = "SSH for secure administration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  # SNMP for monitoring
  ingress {
    description = "SNMP monitoring"
    from_port   = 161
    to_port     = 162
    protocol    = "udp"
    cidr_blocks = [var.monitoring_cidr]
  }

  egress {
    description = "Internal only egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Zone = "data-transfer"
  })
}

# Production Zone - fully isolated
resource "aws_security_group" "production_zone" {
  name        = "${local.name_prefix}-production-zone"
  description = "Security group for isolated production workloads"
  vpc_id      = module.airgap_vpc.vpc_id

  # Internal cluster traffic only
  ingress {
    description = "Internal cluster communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Allow from data transfer zone (post-scanning)
  ingress {
    description     = "From data transfer zone"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.data_transfer_zone.id]
  }

  # SNMP for health monitoring
  ingress {
    description = "SNMP health monitoring"
    from_port   = 161
    to_port     = 162
    protocol    = "udp"
    cidr_blocks = [var.monitoring_cidr]
  }

  egress {
    description = "Internal only"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Zone = "production"
  })
}

# SIEM Zone - isolated security monitoring
resource "aws_security_group" "siem_zone" {
  name        = "${local.name_prefix}-siem-zone"
  description = "Security group for isolated SIEM infrastructure"
  vpc_id      = module.airgap_vpc.vpc_id

  # Syslog ingestion from all zones
  ingress {
    description = "Syslog from production"
    from_port   = 514
    to_port     = 514
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "Syslog TLS from production"
    from_port   = 6514
    to_port     = 6514
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # OT sensor backup ingestion
  ingress {
    description = "OT sensor data"
    from_port   = 5044
    to_port     = 5044
    protocol    = "tcp"
    cidr_blocks = [var.ot_sensor_cidr]
  }

  # SNMP traps
  ingress {
    description = "SNMP traps"
    from_port   = 162
    to_port     = 162
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "No egress - air-gapped"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Zone = "siem"
  })
}

# -----------------------------------------------------------------------------
# EKS Cluster for Air-Gapped Environment
# -----------------------------------------------------------------------------

module "airgap_eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.kubernetes_version

  vpc_id     = module.airgap_vpc.vpc_id
  subnet_ids = module.airgap_vpc.private_subnets

  # Air-gapped cluster configuration
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = false

  # Enable cluster encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks_secrets.arn
    resources        = ["secrets"]
  }

  # Managed node groups for air-gapped workloads
  eks_managed_node_groups = {
    production = {
      name           = "production-nodes"
      instance_types = var.node_instance_types
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      desired_size   = var.node_desired_size

      # Security hardening
      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 1
      }

      # Block device encryption
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            encrypted             = true
            kms_key_id            = aws_kms_key.ebs_encryption.arn
            delete_on_termination = true
          }
        }
      }

      labels = {
        environment  = var.environment
        network-zone = "air-gapped"
      }

      taints = []

      tags = local.common_tags
    }

    scanning = {
      name           = "scanning-nodes"
      instance_types = ["m6i.xlarge"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2

      labels = {
        workload-type = "malware-scanning"
        network-zone  = "data-transfer"
      }

      taints = [{
        key    = "scanning-only"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      tags = merge(local.common_tags, {
        Purpose = "malware-scanning"
      })
    }
  }

  # Cluster add-ons for air-gapped operation
  cluster_addons = {
    coredns = {
      most_recent = true
      configuration_values = jsonencode({
        replicaCount = 2
      })
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# KMS Keys for Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "eks_secrets" {
  description             = "KMS key for EKS secrets encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow EKS to use the key"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Purpose = "eks-secrets-encryption"
  })
}

resource "aws_kms_alias" "eks_secrets" {
  name          = "alias/${local.name_prefix}-eks-secrets"
  target_key_id = aws_kms_key.eks_secrets.key_id
}

resource "aws_kms_key" "ebs_encryption" {
  description             = "KMS key for EBS volume encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Purpose = "ebs-encryption"
  })
}

resource "aws_kms_alias" "ebs_encryption" {
  name          = "alias/${local.name_prefix}-ebs"
  target_key_id = aws_kms_key.ebs_encryption.key_id
}

# -----------------------------------------------------------------------------
# S3 Buckets for Air-Gapped Artifact Storage
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "airgap_artifacts" {
  bucket = "${local.name_prefix}-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Purpose = "container-images-and-artifacts"
  })
}

resource "aws_s3_bucket_versioning" "airgap_artifacts" {
  bucket = aws_s3_bucket.airgap_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "airgap_artifacts" {
  bucket = aws_s3_bucket.airgap_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.ebs_encryption.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "airgap_artifacts" {
  bucket = aws_s3_bucket.airgap_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# SBOM and attestation storage
resource "aws_s3_bucket" "sbom_storage" {
  bucket = "${local.name_prefix}-sbom-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Purpose = "sbom-and-attestations"
  })
}

resource "aws_s3_bucket_versioning" "sbom_storage" {
  bucket = aws_s3_bucket.sbom_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sbom_storage" {
  bucket = aws_s3_bucket.sbom_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.ebs_encryption.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# -----------------------------------------------------------------------------
# ECR for Air-Gapped Container Registry
# -----------------------------------------------------------------------------

resource "aws_ecr_repository" "airgap_registry" {
  for_each = toset(var.container_repositories)

  name                 = "${local.name_prefix}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ebs_encryption.arn
  }

  tags = merge(local.common_tags, {
    Repository = each.value
  })
}

# ECR lifecycle policy for security
resource "aws_ecr_lifecycle_policy" "airgap_registry" {
  for_each   = aws_ecr_repository.airgap_registry
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 signed images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# VPC Endpoints for Air-Gapped AWS Service Access
# -----------------------------------------------------------------------------

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.airgap_vpc.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.airgap_vpc.private_route_table_ids

  tags = merge(local.common_tags, {
    Service = "s3"
  })
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = module.airgap_vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.airgap_vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(local.common_tags, {
    Service = "ecr-api"
  })
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.airgap_vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.airgap_vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(local.common_tags, {
    Service = "ecr-dkr"
  })
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = module.airgap_vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.airgap_vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(local.common_tags, {
    Service = "cloudwatch-logs"
  })
}

resource "aws_vpc_endpoint" "sts" {
  vpc_id              = module.airgap_vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.sts"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.airgap_vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(local.common_tags, {
    Service = "sts"
  })
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "${local.name_prefix}-vpc-endpoints"
  description = "Security group for VPC endpoints"
  vpc_id      = module.airgap_vpc.vpc_id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "Air-gapped VPC ID"
  value       = module.airgap_vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.airgap_eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.airgap_eks.cluster_name
}

output "sbom_bucket" {
  description = "S3 bucket for SBOM storage"
  value       = aws_s3_bucket.sbom_storage.id
}

output "artifacts_bucket" {
  description = "S3 bucket for artifacts"
  value       = aws_s3_bucket.airgap_artifacts.id
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value       = { for k, v in aws_ecr_repository.airgap_registry : k => v.repository_url }
}
