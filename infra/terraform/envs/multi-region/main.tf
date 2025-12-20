# Multi-Region Deployment
# Instantiates regional stacks for Primary (us-west-2) and Secondary (us-east-1) regions
# Configures Global Traffic Management (Route53)

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30.0"
    }
  }

  backend "s3" {
    bucket         = "intelgraph-terraform-state"
    key            = "infrastructure/multi-region/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "intelgraph-terraform-locks"
  }
}

# Primary Region Provider (us-west-2)
provider "aws" {
  region = "us-west-2"
  alias  = "primary"
}

# Secondary Region Provider (us-east-1)
provider "aws" {
  region = "us-east-1"
  alias  = "secondary"
}

variable "project_name" {
  default = "intelgraph"
}

variable "environment" {
  default = "production"
}

# Primary Stack (us-west-2)
module "primary_stack" {
  source = "../../modules/regional-stack"
  providers = {
    aws = aws.primary
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "us-west-2"
  is_primary_region = true
  vpc_cidr          = "10.0.0.0/16"

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  intra_subnets   = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  # Production settings
  postgres_instance_class = "db.r6g.large"
  redis_node_type        = "cache.r6g.large"

  # DNS Configuration (Placeholder for future Ingress)
  ingress_domain         = "us-west-2-api.intelgraph.io"
}

# Redis Global Datastore
resource "aws_elasticache_global_replication_group" "redis" {
  provider = aws.primary

  global_replication_group_id_suffix = "intelgraph-global"
  primary_replication_group_id       = module.primary_stack.redis_replication_group_id

  # Ensure primary stack is created first
  depends_on = [module.primary_stack]
}

# Secondary Stack (us-east-1) - DR / Active-Active
module "secondary_stack" {
  source = "../../modules/regional-stack"
  providers = {
    aws = aws.secondary
  }

  project_name      = var.project_name
  environment       = var.environment
  region            = "us-east-1"
  is_primary_region = false
  vpc_cidr          = "10.1.0.0/16"

  private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
  intra_subnets   = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]

  # Cross-Region Replication inputs
  source_db_identifier        = module.primary_stack.rds_arn
  global_replication_group_id = aws_elasticache_global_replication_group.redis.global_replication_group_id
  primary_auth_token          = module.primary_stack.redis_auth_token

  # DNS Configuration (Placeholder for future Ingress)
  ingress_domain              = "us-east-1-api.intelgraph.io" # Must be managed via ExternalDNS or manually

  # Reduced capacity for DR / Cost optimization
  postgres_instance_class = "db.t3.medium"
  redis_node_type        = "cache.t3.medium"
}

# Route53 Global Traffic Management
data "aws_route53_zone" "primary" {
  provider = aws.primary
  name     = "intelgraph.io"
}

# Health Check for Primary Region
resource "aws_route53_health_check" "primary" {
  provider          = aws.primary
  fqdn              = module.primary_stack.ingress_endpoint # Points to Ingress ALB
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "primary-region-health-check"
  }
}

# Health Check for Secondary Region
resource "aws_route53_health_check" "secondary" {
  provider          = aws.primary
  fqdn              = module.secondary_stack.ingress_endpoint
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "secondary-region-health-check"
  }
}

# Latency-Based Routing Records
# Primary Region Record
resource "aws_route53_record" "api_primary" {
  provider = aws.primary
  zone_id  = data.aws_route53_zone.primary.zone_id
  name     = "api.intelgraph.io"
  type     = "CNAME"
  ttl      = "60"

  records = [module.primary_stack.ingress_endpoint]

  set_identifier = "us-west-2"
  region         = "us-west-2"

  health_check_id = aws_route53_health_check.primary.id
}

# Secondary Region Record
resource "aws_route53_record" "api_secondary" {
  provider = aws.primary
  zone_id  = data.aws_route53_zone.primary.zone_id
  name     = "api.intelgraph.io"
  type     = "CNAME"
  ttl      = "60"

  records = [module.secondary_stack.ingress_endpoint]

  set_identifier = "us-east-1"
  region         = "us-east-1"

  health_check_id = aws_route53_health_check.secondary.id
}
