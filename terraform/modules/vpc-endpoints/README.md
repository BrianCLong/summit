# VPC Endpoints Terraform Module

This module creates AWS VPC Endpoints to eliminate NAT Gateway data transfer charges for AWS services.

## Cost Savings

**Estimated Monthly Savings: $80-120**

- **S3 Gateway Endpoint**: $40-60/month (FREE endpoint, eliminates NAT charges)
- **ECR Interface Endpoints**: $40-60/month (costs $14.40/mo for 2 endpoints, saves more in NAT charges)
- **Secrets Manager Endpoint**: $5-10/month
- **CloudWatch Logs Endpoint**: $10-20/month

### Cost Breakdown

**Gateway Endpoints (FREE)**:
- S3: $0/month + $0 data transfer

**Interface Endpoints** (per endpoint per AZ):
- Cost: $0.01/hour × 3 AZs × 730 hours = $21.90/month per service
- ECR requires 2 endpoints (api + dkr): $14.40/month total
- Savings from eliminated NAT charges typically exceed endpoint costs

**NAT Gateway Charges Being Eliminated**:
- Data processing: $0.045/GB
- Typical S3 + ECR traffic: 2-3 TB/month
- Current NAT cost for this traffic: $90-135/month
- Net savings after endpoint costs: $80-120/month

## Features

- ✅ **S3 Gateway Endpoint** - Free, eliminates all S3 NAT charges
- ✅ **ECR Interface Endpoints** - Reduces NAT charges for container image pulls
- ✅ **Secrets Manager Endpoint** - Optional, for high-volume secret access
- ✅ **SSM Endpoints** - Optional, for Systems Manager connectivity
- ✅ **CloudWatch Logs Endpoint** - Optional, for high-volume logging
- ✅ **STS Endpoint** - Optional, for IAM role assumption
- ✅ **ECS Endpoints** - Optional, if using ECS

## Usage

### Basic Usage (S3 + ECR only - Recommended)

```hcl
module "vpc_endpoints" {
  source = "./modules/vpc-endpoints"

  vpc_id      = aws_vpc.main.id
  region      = "us-east-1"
  environment = "production"

  # Enable only the most cost-effective endpoints
  enable_s3_endpoint  = true  # FREE - always enable
  enable_ecr_endpoints = true  # High ROI for EKS clusters

  tags = {
    Project          = "IntelGraph"
    ManagedBy        = "Terraform"
    CostOptimization = "vpc-endpoints"
  }
}
```

### Full Configuration (All Endpoints)

```hcl
module "vpc_endpoints" {
  source = "./modules/vpc-endpoints"

  vpc_id      = aws_vpc.main.id
  region      = "us-east-1"
  environment = "production"

  # Core endpoints (highest ROI)
  enable_s3_endpoint   = true
  enable_ecr_endpoints = true

  # Optional endpoints (enable based on usage)
  enable_secretsmanager_endpoint = true
  enable_ssm_endpoints           = true
  enable_logs_endpoint           = true
  enable_sts_endpoint            = true
  enable_ecs_endpoints           = false

  # Optional: Restrict S3 endpoint access
  s3_endpoint_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:*"
        Resource  = "*"
      }
    ]
  })

  tags = {
    Project          = "IntelGraph"
    ManagedBy        = "Terraform"
    CostOptimization = "vpc-endpoints"
  }
}
```

### Integration with Existing Infrastructure

```hcl
# Reference existing VPC
data "aws_vpc" "existing" {
  id = "vpc-xxxxx"
}

module "vpc_endpoints" {
  source = "./modules/vpc-endpoints"

  vpc_id      = data.aws_vpc.existing.id
  region      = var.aws_region
  environment = var.environment

  enable_s3_endpoint   = true
  enable_ecr_endpoints = true

  tags = merge(
    var.common_tags,
    {
      CostOptimization = "vpc-endpoints"
      EstimatedSavings = "$80-120/month"
    }
  )
}
```

## Prerequisites

1. **VPC with private subnets** - Tagged with `Tier = "private"`
2. **Route tables** - Associated with private subnets
3. **Terraform** >= 1.0
4. **AWS Provider** >= 5.0

## How It Works

### S3 Gateway Endpoint

- Type: Gateway Endpoint (FREE)
- Updates route tables to direct S3 traffic through the endpoint
- No NAT Gateway traversal for S3 requests
- Zero additional cost

### Interface Endpoints (ECR, Secrets Manager, etc.)

- Type: Interface Endpoint (Elastic Network Interface in each AZ)
- Cost: $0.01/hour per endpoint per AZ
- Private DNS enabled for seamless integration
- Requires security group allowing HTTPS (443) from VPC CIDR

## Deployment Steps

### Step 1: Review Current NAT Costs

```bash
# Run NAT Gateway cost analysis
cd /home/user/summit/scripts/cloud-cost
./nat-gateway-costs.sh
```

### Step 2: Deploy VPC Endpoints

```bash
cd terraform/

# Initialize the module
terraform init

# Plan the changes
terraform plan -out=vpc-endpoints.tfplan

# Review estimated costs
terraform show -json vpc-endpoints.tfplan | jq '.planned_values'

# Apply
terraform apply vpc-endpoints.tfplan
```

### Step 3: Verify Endpoint Functionality

```bash
# Test S3 endpoint (from EC2 instance in private subnet)
aws s3 ls --region us-east-1

# Check that traffic routes through endpoint
aws ec2 describe-vpc-endpoints --region us-east-1

# Test ECR endpoint
aws ecr describe-repositories --region us-east-1
```

### Step 4: Monitor Savings

After 7 days:
```bash
# Re-run NAT Gateway cost analysis
./nat-gateway-costs.sh

# Compare data transfer volumes
# Expected: 50-70% reduction in NAT Gateway data processing
```

## Validation

### Verify Endpoints are Active

```bash
# List all VPC endpoints
aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=vpc-xxxxx" \
  --query 'VpcEndpoints[*].[ServiceName, State, VpcEndpointType]' \
  --output table
```

### Test S3 Access through Endpoint

```bash
# From an EC2 instance in private subnet
# Check routing (should go through VPC endpoint, not NAT)
traceroute -n s3.us-east-1.amazonaws.com

# Verify DNS resolves to private IP (not public)
dig s3.us-east-1.amazonaws.com
```

### Test ECR Image Pull

```bash
# From EKS node or EC2 instance
# Pull an image and monitor network traffic
docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/my-image:latest

# Check CloudWatch metrics for ECR endpoint usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/VPCEndpoint \
  --metric-name PacketsInFromSource \
  --dimensions Name=VpcEndpointId,Value=vpce-xxxxx \
  --start-time 2025-11-19T00:00:00Z \
  --end-time 2025-11-20T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Issue: Pods can't pull images from ECR

**Cause**: Security group not allowing traffic from EKS nodes

**Solution**:
```hcl
# Update security group to allow all VPC CIDR
resource "aws_security_group_rule" "allow_vpc" {
  security_group_id = module.vpc_endpoints.vpc_endpoints_security_group_id
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [data.aws_vpc.main.cidr_block]
}
```

### Issue: S3 access still going through NAT Gateway

**Cause**: Route table not associated with S3 endpoint

**Solution**:
```bash
# Check route table associations
aws ec2 describe-route-tables --route-table-ids rtb-xxxxx

# Verify S3 prefix list is in route table
# Look for "DestinationPrefixListId": "pl-xxxxx"
```

### Issue: Private DNS not resolving

**Cause**: VPC DNS settings not enabled

**Solution**:
```bash
# Enable DNS hostnames and DNS resolution
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-xxxxx \
  --enable-dns-hostnames

aws ec2 modify-vpc-attribute \
  --vpc-id vpc-xxxxx \
  --enable-dns-support
```

## Cost Monitoring

### CloudWatch Metrics

Monitor endpoint usage:
```bash
# Packets processed through endpoint
aws cloudwatch get-metric-statistics \
  --namespace AWS/VPCEndpoint \
  --metric-name PacketsInFromSource \
  --dimensions Name=VpcEndpointId,Value=vpce-xxxxx \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

### Cost Explorer

Compare NAT Gateway costs before/after:
1. Go to AWS Cost Explorer
2. Filter by service: "EC2 - NAT Gateway"
3. Group by "Usage Type" (look for "NatGateway-Bytes")
4. Compare current month vs. previous month

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| vpc_id | The ID of the VPC | `string` | n/a | yes |
| region | AWS region | `string` | `"us-east-1"` | no |
| environment | Environment name | `string` | n/a | yes |
| enable_s3_endpoint | Enable S3 Gateway Endpoint | `bool` | `true` | no |
| enable_ecr_endpoints | Enable ECR Interface Endpoints | `bool` | `true` | no |
| enable_secretsmanager_endpoint | Enable Secrets Manager Endpoint | `bool` | `false` | no |
| enable_ssm_endpoints | Enable SSM Endpoints | `bool` | `false` | no |
| enable_logs_endpoint | Enable CloudWatch Logs Endpoint | `bool` | `false` | no |
| enable_sts_endpoint | Enable STS Endpoint | `bool` | `false` | no |
| enable_ecs_endpoints | Enable ECS Endpoints | `bool` | `false` | no |
| tags | Tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| s3_endpoint_id | ID of S3 Gateway Endpoint |
| ecr_api_endpoint_id | ID of ECR API Interface Endpoint |
| ecr_dkr_endpoint_id | ID of ECR DKR Interface Endpoint |
| vpc_endpoints_security_group_id | Security group ID for endpoints |
| estimated_monthly_savings | Breakdown of estimated savings |

## References

- [AWS VPC Endpoints Pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS PrivateLink Documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/)
- [Cost Optimization Review](/home/user/summit/docs/cloud-cost-optimization-review.md)

## Changelog

- **2025-11-20**: Initial module creation for cost optimization initiative
