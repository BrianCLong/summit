# ECR Lifecycle Policy Templates

Automated cleanup of old container images to reduce ECR storage costs.

**Estimated Savings: $5-15/month** (depending on image count and size)

## Cost Breakdown

**ECR Storage Pricing**:
- $0.10 per GB per month

**Typical Waste**:
- Build pipeline creates ~5-10 images per day
- Each image: 500MB-2GB
- Without cleanup: 150-300 images/month = 75-600GB
- Cost: $7.50-60/month

**With Lifecycle Policies**:
- Keep only last 10 production images
- Delete untagged images after 14 days
- Expected: 10-30 images total = 5-60GB
- Cost: $0.50-6/month
- **Savings: $5-15/month per repository**

## Policy Templates

### 1. Standard Lifecycle (`standard-lifecycle.json`)

**Recommended for most use cases**

**Rules**:
1. Keep last 10 tagged images (v*, release*, prod*)
2. Delete untagged images after 14 days
3. Keep only last 3 development images (dev*, feature*, test*)

**Use Case**: Balanced retention for production deployments with rollback capability

**Retention**:
- Production: ~10 versions
- Development: ~3 versions
- Untagged: 14 days

### 2. Aggressive Cleanup (`aggressive-cleanup.json`)

**Maximum cost savings**

**Rules**:
1. Keep last 5 production images
2. Delete untagged images after 7 days
3. Keep only last 2 staging images
4. Keep only last 1 development image
5. Delete any other images older than 30 days

**Use Case**: High-frequency deployments, limited rollback needs

**Retention**:
- Production: ~5 versions
- Staging: ~2 versions
- Development: ~1 version
- Untagged: 7 days

## Usage

### Option 1: Automated Script (Recommended)

```bash
cd /home/user/summit/scripts/cloud-cost

# Dry run first
./apply-ecr-lifecycle-policies.sh

# Apply standard policy to all repositories
DRY_RUN=false ./apply-ecr-lifecycle-policies.sh

# Use aggressive cleanup policy
DRY_RUN=false POLICY_FILE=aggressive-cleanup.json ./apply-ecr-lifecycle-policies.sh
```

### Option 2: AWS CLI (Single Repository)

```bash
# Apply to specific repository
aws ecr put-lifecycle-policy \
  --repository-name intelgraph/app \
  --lifecycle-policy-text file://standard-lifecycle.json

# Verify policy was applied
aws ecr get-lifecycle-policy \
  --repository-name intelgraph/app
```

### Option 3: Terraform

```hcl
resource "aws_ecr_repository" "app" {
  name = "intelgraph/app"
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release", "prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Policy Rules Explained

### Rule Priority

- Lower numbers = higher priority
- Rules are evaluated in order
- First matching rule wins

### Tag Status

- `tagged`: Images with at least one tag
- `untagged`: Images without tags (usually intermediate build layers)
- `any`: All images

### Count Type

- `imageCountMoreThan`: Keep N most recent images
- `sinceImagePushed`: Based on time since pushed

### Tag Prefix List

Matches images with tags starting with:
- `v*`: Version tags (v1.0.0, v2.1.3)
- `release*`: Release tags (release-2023-11-20)
- `prod*`: Production tags (prod-123)
- `dev*`: Development tags (dev-feature-x)

## Customization Examples

### Keep More Production Images

```json
{
  "rulePriority": 1,
  "description": "Keep last 20 production images for extended rollback",
  "selection": {
    "tagStatus": "tagged",
    "tagPrefixList": ["prod", "release"],
    "countType": "imageCountMoreThan",
    "countNumber": 20
  },
  "action": {
    "type": "expire"
  }
}
```

### Keep Images by Specific Tag Pattern

```json
{
  "rulePriority": 1,
  "description": "Keep all LTS (Long Term Support) releases",
  "selection": {
    "tagStatus": "tagged",
    "tagPrefixList": ["lts"],
    "countType": "imageCountMoreThan",
    "countNumber": 100
  },
  "action": {
    "type": "expire"
  }
}
```

### Aggressive Cleanup for CI/CD

```json
{
  "rulePriority": 1,
  "description": "Delete untagged images after 1 day",
  "selection": {
    "tagStatus": "untagged",
    "countType": "sinceImagePushed",
    "countUnit": "days",
    "countNumber": 1
  },
  "action": {
    "type": "expire"
  }
}
```

## Best Practices

### 1. Always Tag Production Images

```bash
# Good: Semantic versioning
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.2.3
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:prod-1.2.3

# Bad: No tags or generic tags
docker tag myapp 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### 2. Use Consistent Tag Prefixes

```bash
# Production
prod-*
release-*
v*

# Staging
staging-*
stg-*

# Development
dev-*
feature-*
branch-*
```

### 3. Test Lifecycle Policies First

```bash
# Preview what would be deleted (not a real AWS command)
# Use the ECR console "Dry run" feature or monitor for 24 hours

# Apply to one repository first
aws ecr put-lifecycle-policy \
  --repository-name test-repo \
  --lifecycle-policy-text file://standard-lifecycle.json

# Wait 24 hours and verify
aws ecr describe-images --repository-name test-repo
```

### 4. Monitor Image Deletions

```bash
# Get lifecycle policy evaluation results
aws ecr get-lifecycle-policy-preview \
  --repository-name myapp \
  --lifecycle-policy-text file://standard-lifecycle.json

# Check CloudWatch Logs for deletion events
aws logs filter-log-events \
  --log-group-name /aws/ecr/lifecycle \
  --start-time $(date -d '1 day ago' +%s)000
```

## Troubleshooting

### Issue: Important images were deleted

**Prevention**:
- Tag images you want to keep with protected prefixes (prod, release)
- Increase countNumber for production rules
- Use `imageCountMoreThan` instead of time-based expiration

**Recovery**:
- Images are not immediately deleted (24-hour grace period)
- Check if image manifest is still in CloudWatch Logs
- Re-push image from CI/CD pipeline

### Issue: Policy not taking effect

**Solution**:
- Policies are evaluated every 24 hours
- Check policy syntax with:
  ```bash
  aws ecr get-lifecycle-policy --repository-name myapp
  ```
- Verify rule priorities don't conflict

### Issue: Still seeing untagged images

**Cause**: Docker multi-stage builds create intermediate layers

**Solution**:
- Use `.dockerignore` to reduce layers
- Clean up build cache regularly
- Reduce countNumber for untagged images to 1-3 days

## Monitoring Savings

### Before Applying Policies

```bash
# Count images per repository
for repo in $(aws ecr describe-repositories --query 'repositories[*].repositoryName' --output text); do
  count=$(aws ecr list-images --repository-name $repo --query 'length(imageIds)' --output text)
  echo "$repo: $count images"
done

# Calculate total storage
aws ecr describe-repositories --query 'repositories[*].[repositoryName, repositoryUri]' --output table
```

### After 30 Days

```bash
# Compare image counts
for repo in $(aws ecr describe-repositories --query 'repositories[*].repositoryName' --output text); do
  count=$(aws ecr list-images --repository-name $repo --query 'length(imageIds)' --output text)
  echo "$repo: $count images"
done

# Check Cost Explorer
# Filter by service: "EC2 Container Registry (ECR)"
# Compare month-over-month costs
```

## GitHub Actions Integration

```yaml
# .github/workflows/build.yml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build and tag image
        run: |
          # Always tag with version for lifecycle policy
          docker build -t myapp:${{ github.sha }} .
          docker tag myapp:${{ github.sha }} $ECR_REPO:prod-${{ github.ref_name }}-${{ github.sha }}
          docker tag myapp:${{ github.sha }} $ECR_REPO:v$(cat VERSION)

      - name: Push to ECR
        run: |
          docker push $ECR_REPO:prod-${{ github.ref_name }}-${{ github.sha }}
          docker push $ECR_REPO:v$(cat VERSION)
```

## Terraform Module

```hcl
# terraform/modules/ecr-with-lifecycle/main.tf
resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  tags = merge(
    var.tags,
    {
      CostOptimization = "ecr-lifecycle"
    }
  )
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = var.lifecycle_policy != null ? var.lifecycle_policy : jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release", "prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## References

- [ECR Lifecycle Policies Documentation](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html)
- [ECR Pricing](https://aws.amazon.com/ecr/pricing/)
- [Cost Optimization Review](/home/user/summit/docs/cloud-cost-optimization-review.md)

---

**Last Updated**: 2025-11-20
