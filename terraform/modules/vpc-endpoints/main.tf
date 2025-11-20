# VPC Endpoints Module for Cost Optimization
# Creates S3 Gateway Endpoint (free) and ECR Interface Endpoints
# Estimated savings: $80-120/month by eliminating NAT Gateway data transfer

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data source for VPC
data "aws_vpc" "main" {
  id = var.vpc_id
}

# Data source for private subnets
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "private"
  }
}

# Data source for route tables associated with private subnets
data "aws_route_tables" "private" {
  vpc_id = var.vpc_id

  filter {
    name   = "association.subnet-id"
    values = data.aws_subnets.private.ids
  }
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_description = "Security group for VPC endpoints"
  description     = "Allow HTTPS traffic from VPC to VPC endpoints"
  vpc_id          = var.vpc_id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-vpc-endpoints-sg"
      CostOptimization = "vpc-endpoints"
    }
  )
}

# S3 Gateway Endpoint (FREE - no hourly charge, no data transfer charge)
resource "aws_vpc_endpoint" "s3" {
  count = var.enable_s3_endpoint ? 1 : 0

  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.private.ids

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-s3-gateway-endpoint"
      CostOptimization = "eliminates-nat-charges-for-s3"
      EstimatedMonthlySavings = "$40-60"
    }
  )
}

# S3 Gateway Endpoint Policy (optional - restrict access)
resource "aws_vpc_endpoint_policy" "s3" {
  count = var.enable_s3_endpoint && var.s3_endpoint_policy != null ? 1 : 0

  vpc_endpoint_id = aws_vpc_endpoint.s3[0].id
  policy          = var.s3_endpoint_policy
}

# ECR API Interface Endpoint
resource "aws_vpc_endpoint" "ecr_api" {
  count = var.enable_ecr_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ecr-api-endpoint"
      CostOptimization = "reduces-nat-charges-for-ecr"
      EstimatedMonthlySavings = "$20-30"
    }
  )
}

# ECR DKR Interface Endpoint (for Docker image pulls)
resource "aws_vpc_endpoint" "ecr_dkr" {
  count = var.enable_ecr_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ecr-dkr-endpoint"
      CostOptimization = "reduces-nat-charges-for-ecr"
      EstimatedMonthlySavings = "$20-30"
    }
  )
}

# Secrets Manager Interface Endpoint (optional)
resource "aws_vpc_endpoint" "secretsmanager" {
  count = var.enable_secretsmanager_endpoint ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-secretsmanager-endpoint"
      CostOptimization = "reduces-nat-charges"
      EstimatedMonthlySavings = "$5-10"
    }
  )
}

# SSM Interface Endpoint (for Systems Manager)
resource "aws_vpc_endpoint" "ssm" {
  count = var.enable_ssm_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ssm-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}

# SSM Messages Interface Endpoint
resource "aws_vpc_endpoint" "ssmmessages" {
  count = var.enable_ssm_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ssmmessages-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}

# EC2 Messages Interface Endpoint (for SSM Session Manager)
resource "aws_vpc_endpoint" "ec2messages" {
  count = var.enable_ssm_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ec2messages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ec2messages-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}

# CloudWatch Logs Interface Endpoint (optional)
resource "aws_vpc_endpoint" "logs" {
  count = var.enable_logs_endpoint ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-logs-endpoint"
      CostOptimization = "reduces-nat-charges"
      EstimatedMonthlySavings = "$10-20"
    }
  )
}

# STS Interface Endpoint (for IAM role assumption)
resource "aws_vpc_endpoint" "sts" {
  count = var.enable_sts_endpoint ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.sts"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-sts-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}

# ECS Interface Endpoints (if using ECS)
resource "aws_vpc_endpoint" "ecs" {
  count = var.enable_ecs_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ecs-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}

resource "aws_vpc_endpoint" "ecs_agent" {
  count = var.enable_ecs_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecs-agent"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ecs-agent-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}

resource "aws_vpc_endpoint" "ecs_telemetry" {
  count = var.enable_ecs_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecs-telemetry"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ecs-telemetry-endpoint"
      CostOptimization = "reduces-nat-charges"
    }
  )
}
