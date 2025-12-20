# AWS Infrastructure Module
# Provisions VPC, EKS, storage, and networking resources

locals {
  cluster_name = "${var.project_name}-${var.environment}-eks"

  azs = slice(var.availability_zones, 0, min(3, length(var.availability_zones)))
}

# VPC Configuration
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = local.azs
  private_subnets = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k + 3)]
  database_subnets = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k + 6)]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "dev"
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPN Gateway
  enable_vpn_gateway = var.enable_vpn

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true

  # Kubernetes tags
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
  }

  tags = var.tags
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cluster access
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # IRSA (IAM Roles for Service Accounts)
  enable_irsa = true

  # Cluster encryption
  cluster_encryption_config = {
    resources        = ["secrets"]
    provider_key_arn = aws_kms_key.eks.arn
  }

  # Cluster add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
      service_account_role_arn = aws_iam_role.ebs_csi_driver.arn
    }
    aws-efs-csi-driver = {
      most_recent = true
      service_account_role_arn = aws_iam_role.efs_csi_driver.arn
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    general = {
      name = "${local.cluster_name}-general"

      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.min_nodes
      max_size     = var.max_nodes
      desired_size = var.desired_nodes

      # Use latest EKS-optimized AMI
      use_custom_launch_template = false

      disk_size = 100

      labels = {
        Environment = var.environment
        NodeGroup   = "general"
      }

      tags = merge(
        var.tags,
        {
          "k8s.io/cluster-autoscaler/enabled"               = "true"
          "k8s.io/cluster-autoscaler/${local.cluster_name}" = "owned"
        }
      )
    }

    spot = {
      name = "${local.cluster_name}-spot"

      instance_types = var.node_instance_types
      capacity_type  = "SPOT"

      min_size     = 0
      max_size     = var.max_nodes
      desired_size = var.enable_spot_instances ? 2 : 0

      labels = {
        Environment = var.environment
        NodeGroup   = "spot"
        Lifecycle   = "spot"
      }

      taints = [
        {
          key    = "spot"
          value  = "true"
          effect = "NoSchedule"
        }
      ]

      tags = var.tags
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  tags = var.tags
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS cluster ${local.cluster_name} encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.cluster_name}"
  target_key_id = aws_kms_key.eks.key_id
}

# IAM role for EBS CSI driver
resource "aws_iam_role" "ebs_csi_driver" {
  name = "${local.cluster_name}-ebs-csi-driver"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi_driver.name
}

# IAM role for EFS CSI driver
resource "aws_iam_role" "efs_csi_driver" {
  name = "${local.cluster_name}-efs-csi-driver"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:efs-csi-controller-sa"
        }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_policy" "efs_csi_driver" {
  name = "${local.cluster_name}-efs-csi-driver"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:DescribeAccessPoints",
          "elasticfilesystem:DescribeFileSystems",
          "elasticfilesystem:DescribeMountTargets",
          "elasticfilesystem:CreateAccessPoint",
          "elasticfilesystem:DeleteAccessPoint",
          "elasticfilesystem:TagResource"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "efs_csi_driver" {
  policy_arn = aws_iam_policy.efs_csi_driver.arn
  role       = aws_iam_role.efs_csi_driver.name
}

# EFS for persistent storage
resource "aws_efs_file_system" "eks" {
  count = var.enable_efs ? 1 : 0

  creation_token = local.cluster_name
  encrypted      = true
  kms_key_id     = aws_kms_key.eks.arn

  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = merge(
    var.tags,
    {
      Name = "${local.cluster_name}-efs"
    }
  )
}

resource "aws_efs_mount_target" "eks" {
  count = var.enable_efs ? length(module.vpc.private_subnets) : 0

  file_system_id  = aws_efs_file_system.eks[0].id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs[0].id]
}

resource "aws_security_group" "efs" {
  count = var.enable_efs ? 1 : 0

  name_prefix = "${local.cluster_name}-efs"
  description = "Security group for EFS mount targets"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

# S3 Buckets for storage and backup
resource "aws_s3_bucket" "data" {
  bucket = "${var.project_name}-${var.environment}-data-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.tags,
    {
      Purpose = "Data Storage"
    }
  )
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.eks.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "backup" {
  count = var.enable_s3_backup ? 1 : 0

  bucket = "${var.project_name}-${var.environment}-backup-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.tags,
    {
      Purpose = "Backup"
    }
  )
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  count = var.enable_s3_backup ? 1 : 0

  bucket = aws_s3_bucket.backup[0].id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    transition {
      days          = 90
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 365
    }
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "cluster" {
  count = var.enable_secrets_manager ? 1 : 0

  name_prefix             = "${local.cluster_name}-"
  description             = "Secrets for ${local.cluster_name}"
  kms_key_id              = aws_kms_key.eks.arn
  recovery_window_in_days = 7

  tags = var.tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "cluster" {
  count = var.enable_cloudwatch ? 1 : 0

  name              = "/aws/eks/${local.cluster_name}"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.eks.arn

  tags = var.tags
}

# AWS Backup Vault
resource "aws_backup_vault" "cluster" {
  name        = "${local.cluster_name}-backup-vault"
  kms_key_arn = aws_kms_key.eks.arn

  tags = var.tags
}

# Data source
data "aws_caller_identity" "current" {}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnets" {
  value = module.vpc.private_subnets
}

output "public_subnets" {
  value = module.vpc.public_subnets
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_ca" {
  value = module.eks.cluster_certificate_authority_data
}

output "eks_cluster_token" {
  value     = data.aws_eks_cluster_auth.cluster.token
  sensitive = true
}

output "efs_id" {
  value = var.enable_efs ? aws_efs_file_system.eks[0].id : null
}

output "s3_buckets" {
  value = {
    data   = aws_s3_bucket.data.id
    backup = var.enable_s3_backup ? aws_s3_bucket.backup[0].id : null
  }
}

output "backup_vault_arn" {
  value = aws_backup_vault.cluster.arn
}

output "log_group_name" {
  value = var.enable_cloudwatch ? aws_cloudwatch_log_group.cluster[0].name : null
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}
