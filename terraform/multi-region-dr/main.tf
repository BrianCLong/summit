terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  backend "s3" {
    bucket         = "summit-tf-state-multiregion"
    key            = "global/multiregion.tfstate"
    region         = "us-east-1"
    dynamodb_table = "summit-tf-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.primary_region
  alias  = "primary"
}

provider "aws" {
  region = var.secondary_region
  alias  = "secondary"
}

provider "aws" {
  region = var.tertiary_region
  alias  = "tertiary"
}

# --- VPCs ---

module "vpc_primary" {
  source = "../modules/vpc"
  providers = {
    aws = aws.primary
  }
  environment    = var.environment
  cidr_block     = var.vpc_cidrs[var.primary_region]
  public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  azs            = ["${var.primary_region}a", "${var.primary_region}b"]
}

module "vpc_secondary" {
  source = "../modules/vpc"
  providers = {
    aws = aws.secondary
  }
  environment    = var.environment
  cidr_block     = var.vpc_cidrs[var.secondary_region]
  public_subnets = ["10.1.1.0/24", "10.1.2.0/24"]
  azs            = ["${var.secondary_region}a", "${var.secondary_region}b"]
}

module "vpc_tertiary" {
  source = "../modules/vpc"
  providers = {
    aws = aws.tertiary
  }
  environment    = var.environment
  cidr_block     = var.vpc_cidrs[var.tertiary_region]
  public_subnets = ["10.2.1.0/24", "10.2.2.0/24"]
  azs            = ["${var.tertiary_region}a", "${var.tertiary_region}b"]
}

# --- Subnet Groups ---

resource "aws_db_subnet_group" "primary" {
  provider   = aws.primary
  name       = "summit-db-subnet-group"
  subnet_ids = module.vpc_primary.public_subnets # In prod, utilize private subnets
  tags = {
    Name = "My DB subnet group"
  }
}

resource "aws_elasticache_subnet_group" "primary" {
  provider   = aws.primary
  name       = "summit-redis-subnet-group"
  subnet_ids = module.vpc_primary.public_subnets
}

# (Subnet groups for other regions would be similar)

# --- EKS Clusters ---

resource "aws_eks_cluster" "primary" {
  provider = aws.primary
  name     = "summit-primary"
  role_arn = aws_iam_role.eks_cluster.arn
  vpc_config {
    subnet_ids = module.vpc_primary.public_subnets
  }
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

resource "aws_eks_cluster" "secondary" {
  provider = aws.secondary
  name     = "summit-secondary"
  role_arn = aws_iam_role.eks_cluster.arn
  vpc_config {
    subnet_ids = module.vpc_secondary.public_subnets
  }
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

resource "aws_eks_cluster" "tertiary" {
  provider = aws.tertiary
  name     = "summit-tertiary"
  role_arn = aws_iam_role.eks_cluster.arn
  vpc_config {
    subnet_ids = module.vpc_tertiary.public_subnets
  }
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

# --- Load Balancers ---

resource "aws_lb" "primary" {
  provider           = aws.primary
  name               = "summit-alb-primary"
  internal           = false
  load_balancer_type = "application"
  subnets            = module.vpc_primary.public_subnets
}

resource "aws_lb" "secondary" {
  provider           = aws.secondary
  name               = "summit-alb-secondary"
  internal           = false
  load_balancer_type = "application"
  subnets            = module.vpc_secondary.public_subnets
}

resource "aws_lb" "tertiary" {
  provider           = aws.tertiary
  name               = "summit-alb-tertiary"
  internal           = false
  load_balancer_type = "application"
  subnets            = module.vpc_tertiary.public_subnets
}


# --- Aurora Global Database ---

data "aws_secretsmanager_secret_version" "db_password" {
  provider  = aws.primary
  secret_id = "summit/db/password"
}

resource "aws_rds_global_cluster" "aurora_global" {
  provider                  = aws.primary
  global_cluster_identifier = "summit-global-db"
  engine                    = "aurora-postgresql"
  engine_version            = "15.3"
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary" {
  provider                  = aws.primary
  cluster_identifier        = "summit-primary"
  global_cluster_identifier = aws_rds_global_cluster.aurora_global.id
  engine                    = aws_rds_global_cluster.aurora_global.engine
  engine_version            = aws_rds_global_cluster.aurora_global.engine_version
  availability_zones        = ["${var.primary_region}a", "${var.primary_region}b"]
  database_name             = "summit"
  master_username           = "summit_admin"
  master_password           = data.aws_secretsmanager_secret_version.db_password.secret_string
  backup_retention_period   = 7
  preferred_backup_window   = "07:00-09:00"
  skip_final_snapshot       = true
  db_subnet_group_name      = aws_db_subnet_group.primary.name

  depends_on = [module.vpc_primary]
}

resource "aws_rds_cluster" "secondary" {
  provider                  = aws.secondary
  cluster_identifier        = "summit-secondary"
  global_cluster_identifier = aws_rds_global_cluster.aurora_global.id
  engine                    = aws_rds_global_cluster.aurora_global.engine
  engine_version            = aws_rds_global_cluster.aurora_global.engine_version
  availability_zones        = ["${var.secondary_region}a", "${var.secondary_region}b"]
  skip_final_snapshot       = true

  depends_on = [module.vpc_secondary, aws_rds_cluster.primary]
}

resource "aws_rds_cluster" "tertiary" {
  provider                  = aws.tertiary
  cluster_identifier        = "summit-tertiary"
  global_cluster_identifier = aws_rds_global_cluster.aurora_global.id
  engine                    = aws_rds_global_cluster.aurora_global.engine
  engine_version            = aws_rds_global_cluster.aurora_global.engine_version
  availability_zones        = ["${var.tertiary_region}a", "${var.tertiary_region}b"]
  skip_final_snapshot       = true

  depends_on = [module.vpc_tertiary, aws_rds_cluster.primary]
}

# --- Redis Global Replication Group ---

resource "aws_elasticache_global_replication_group" "redis_global" {
  provider                           = aws.primary
  global_replication_group_id_suffix = "summit-global-redis"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
}

resource "aws_elasticache_replication_group" "primary" {
  provider                   = aws.primary
  replication_group_id       = "summit-redis-primary"
  description                = "Primary Redis Cluster"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.t4g.medium"
  num_cache_clusters         = 2
  parameter_group_name       = "default.redis7"
  port                       = 6379
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.primary.name
}

resource "aws_elasticache_replication_group" "secondary" {
  provider                    = aws.secondary
  replication_group_id        = "summit-redis-secondary"
  description                 = "Secondary Redis Cluster"
  global_replication_group_id = aws_elasticache_global_replication_group.redis_global.global_replication_group_id
  num_cache_clusters          = 1 # Read replica
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
}

resource "aws_elasticache_replication_group" "tertiary" {
  provider                    = aws.tertiary
  replication_group_id        = "summit-redis-tertiary"
  description                 = "Tertiary Redis Cluster"
  global_replication_group_id = aws_elasticache_global_replication_group.redis_global.global_replication_group_id
  num_cache_clusters          = 1 # Read replica
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
}

# --- Neo4j Causal Cluster (Kubernetes Deployment via Helm) ---

provider "helm" {
  alias = "primary"
  kubernetes {
    host                   = aws_eks_cluster.primary.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.primary.certificate_authority[0].data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      args        = ["eks", "get-token", "--cluster-name", aws_eks_cluster.primary.name]
      command     = "aws"
    }
  }
}

resource "helm_release" "neo4j_primary" {
  provider   = helm.primary
  name       = "neo4j-cluster"
  repository = "https://helm.neo4j.com/neo4j"
  chart      = "neo4j"
  version    = "5.0.0"

  set {
    name  = "neo4j.name"
    value = "summit-neo4j"
  }
  set {
    name  = "core.numberOfServers"
    value = "3"
  }
}

# Secondary and Tertiary are Read Replicas (simplified)
resource "helm_release" "neo4j_secondary" {
  provider   = helm.primary # Note: Needs secondary helm provider in real implementation
  name       = "neo4j-replica-secondary"
  repository = "https://helm.neo4j.com/neo4j"
  chart      = "neo4j"
  version    = "5.0.0"

  # Configuration would be different for read replica connected to Core in Primary
}

# --- Cross-Region Sync (SNS/SQS) ---

# Global SNS Topic (Primary)
resource "aws_sns_topic" "global_sync_primary" {
  provider = aws.primary
  name     = "summit-global-sync"
}

# SQS Queues (One per region)
resource "aws_sqs_queue" "sync_queue_primary" {
  provider = aws.primary
  name     = "summit-sync-queue-us-east-1"
}

resource "aws_sqs_queue" "sync_queue_secondary" {
  provider = aws.secondary
  name     = "summit-sync-queue-us-west-2"
}

resource "aws_sqs_queue" "sync_queue_tertiary" {
  provider = aws.tertiary
  name     = "summit-sync-queue-eu-west-1"
}

# Subscriptions (All queues subscribe to Primary SNS Topic)
# Note: Cross-region SNS subscriptions require extra permissions/setup but this is the logical structure.

resource "aws_sns_topic_subscription" "primary_sub" {
  provider  = aws.primary
  topic_arn = aws_sns_topic.global_sync_primary.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sync_queue_primary.arn
}

resource "aws_sns_topic_subscription" "secondary_sub" {
  provider  = aws.primary # Subscription managed in topic owner region usually
  topic_arn = aws_sns_topic.global_sync_primary.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sync_queue_secondary.arn
}

resource "aws_sns_topic_subscription" "tertiary_sub" {
  provider  = aws.primary
  topic_arn = aws_sns_topic.global_sync_primary.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sync_queue_tertiary.arn
}

# SQS Policies to allow SNS to write (Simplified)
resource "aws_sqs_queue_policy" "primary_policy" {
  provider  = aws.primary
  queue_url = aws_sqs_queue.sync_queue_primary.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.sync_queue_primary.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.global_sync_primary.arn }
      }
    }]
  })
}

# (Repeat policies for secondary/tertiary queues with cross-account/region permissions if needed)

# --- CloudFront Global Distribution ---

resource "aws_cloudfront_distribution" "global_cdn" {
  provider = aws.primary

  origin_group {
    origin_id = "group-api"

    failover_criteria {
      status_codes = [500, 502, 503, 504]
    }

    member {
      origin_id = "primary-api"
    }
    member {
      origin_id = "secondary-api"
    }
    # CloudFront Origin Groups currently support only 2 members (Primary/Secondary).
  }

  origin {
    domain_name = aws_lb.primary.dns_name
    origin_id   = "primary-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name = aws_lb.secondary.dns_name
    origin_id   = "secondary-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name = aws_lb.tertiary.dns_name
    origin_id   = "tertiary-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Global Multi-Region API Distribution"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "group-api"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
