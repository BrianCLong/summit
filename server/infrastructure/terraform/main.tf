# Summit v4.0.0 Cloud Infrastructure
# ==================================
# Terraform configuration for AWS EKS deployment

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "summit-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "summit-terraform-locks"
  }
}

# ===========================================
# Providers
# ===========================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Summit"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Version     = "4.0.0"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ===========================================
# Data Sources
# ===========================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# ===========================================
# VPC
# ===========================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = 1
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }

  tags = {
    Environment = var.environment
  }
}

# ===========================================
# EKS Cluster
# ===========================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  # Cluster addons
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
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Node groups
  eks_managed_node_groups = {
    # Application nodes
    application = {
      name           = "summit-app"
      instance_types = ["m6i.xlarge"]

      min_size     = 3
      max_size     = 20
      desired_size = 5

      capacity_type = "ON_DEMAND"

      labels = {
        role = "application"
      }

      taints = []

      update_config = {
        max_unavailable_percentage = 33
      }
    }

    # AI/ML nodes (larger for LLM processing)
    ai_workloads = {
      name           = "summit-ai"
      instance_types = ["m6i.2xlarge"]

      min_size     = 2
      max_size     = 10
      desired_size = 3

      capacity_type = "ON_DEMAND"

      labels = {
        role        = "ai-workloads"
        workload    = "ai-governance"
      }

      taints = [
        {
          key    = "ai-workloads"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }

    # Database nodes (high memory)
    database = {
      name           = "summit-db"
      instance_types = ["r6i.xlarge"]

      min_size     = 2
      max_size     = 4
      desired_size = 2

      capacity_type = "ON_DEMAND"

      labels = {
        role = "database"
      }

      taints = [
        {
          key    = "database"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }

  # IRSA for AWS Load Balancer Controller
  enable_irsa = true

  # Cluster access
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/SummitAdminRole"
      username = "admin"
      groups   = ["system:masters"]
    },
  ]

  tags = {
    Environment = var.environment
  }
}

# ===========================================
# KMS Key for EKS
# ===========================================

resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.cluster_name}-eks-key"
  }
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.cluster_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# ===========================================
# EBS CSI Driver IRSA
# ===========================================

module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name             = "${var.cluster_name}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}

# ===========================================
# RDS PostgreSQL
# ===========================================

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.cluster_name}-postgresql"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "summit"
  username = "summit_admin"
  port     = 5432

  multi_az               = true
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  maintenance_window              = "Mon:00:00-Mon:03:00"
  backup_window                   = "03:00-06:00"
  backup_retention_period         = 30
  delete_automated_backups        = false
  skip_final_snapshot             = false
  final_snapshot_identifier_prefix = "${var.cluster_name}-final"
  deletion_protection             = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  create_monitoring_role = true
  monitoring_interval    = 60
  monitoring_role_name   = "${var.cluster_name}-rds-monitoring"

  parameters = [
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  ]

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.cluster_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  tags = {
    Name = "${var.cluster_name}-rds"
  }
}

# ===========================================
# ElastiCache Redis
# ===========================================

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.cluster_name}-redis"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.cluster_name}-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  tags = {
    Name = "${var.cluster_name}-redis"
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.cluster_name}-redis"
  description          = "Summit Redis cluster"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_clusters   = 2
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = 7
  snapshot_window          = "05:00-09:00"
  maintenance_window       = "mon:10:00-mon:14:00"

  tags = {
    Environment = var.environment
  }
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# ===========================================
# AWS CloudHSM (for Zero-Trust)
# ===========================================

resource "aws_cloudhsm_v2_cluster" "summit" {
  count = var.enable_hsm ? 1 : 0

  hsm_type   = "hsm1.medium"
  subnet_ids = slice(module.vpc.private_subnets, 0, 2)

  tags = {
    Name = "${var.cluster_name}-hsm"
  }
}

# ===========================================
# S3 Buckets
# ===========================================

resource "aws_s3_bucket" "audit_logs" {
  bucket = "${var.cluster_name}-audit-logs"

  tags = {
    Name = "${var.cluster_name}-audit-logs"
  }
}

resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===========================================
# Secrets Manager
# ===========================================

resource "aws_secretsmanager_secret" "summit" {
  name = "${var.cluster_name}/secrets"

  tags = {
    Name = "${var.cluster_name}-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "summit" {
  secret_id = aws_secretsmanager_secret.summit.id
  secret_string = jsonencode({
    DATABASE_URL       = "postgresql://${module.rds.db_instance_username}:${module.rds.db_instance_password}@${module.rds.db_instance_endpoint}/${module.rds.db_instance_name}"
    REDIS_URL          = "rediss://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
    JWT_SECRET         = random_password.jwt_secret.result
    LLM_API_KEY        = var.llm_api_key
  })
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# ===========================================
# Route53 DNS
# ===========================================

data "aws_route53_zone" "summit" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.summit.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.lb_dns_name
    zone_id                = module.alb.lb_zone_id
    evaluate_target_health = true
  }
}

# ===========================================
# Application Load Balancer
# ===========================================

module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "~> 9.0"

  name = "${var.cluster_name}-alb"

  load_balancer_type = "application"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true

  security_group_ingress_rules = {
    all_https = {
      from_port   = 443
      to_port     = 443
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }

  security_group_egress_rules = {
    all = {
      ip_protocol = "-1"
      cidr_ipv4   = module.vpc.vpc_cidr_block
    }
  }

  listeners = {
    https = {
      port            = 443
      protocol        = "HTTPS"
      ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      certificate_arn = aws_acm_certificate.api.arn

      forward = {
        target_group_key = "summit-api"
      }
    }
  }

  target_groups = {
    summit-api = {
      backend_protocol = "HTTP"
      backend_port     = 80
      target_type      = "ip"

      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 3
      }
    }
  }

  tags = {
    Environment = var.environment
  }
}

# ===========================================
# ACM Certificate
# ===========================================

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.api.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.cluster_name}-api-cert"
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.summit.zone_id
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ===========================================
# CloudWatch Log Groups
# ===========================================

resource "aws_cloudwatch_log_group" "summit" {
  name              = "/summit/${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
  }
}
