# ECR repos per account
resource "aws_ecr_repository" "dev" {
  provider = aws.dev
  name     = "${var.name_prefix}-dev"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}
resource "aws_ecr_repository" "staging" {
  provider = aws.staging
  name     = "${var.name_prefix}-staging"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}
resource "aws_ecr_repository" "prod" {
  provider = aws.prod
  name     = "${var.name_prefix}-prod"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

# OIDC provider lookups (assumes already created in each account)
data "aws_caller_identity" "dev" { provider = aws.dev }
data "aws_caller_identity" "staging" { provider = aws.staging }
data "aws_caller_identity" "prod" { provider = aws.prod }

data "aws_iam_openid_connect_provider" "dev" {
  provider = aws.dev
  arn = "arn:aws:iam::${data.aws_caller_identity.dev.account_id}:oidc-provider/token.actions.githubusercontent.com"
}
data "aws_iam_openid_connect_provider" "staging" {
  provider = aws.staging
  arn = "arn:aws:iam::${data.aws_caller_identity.staging.account_id}:oidc-provider/token.actions.githubusercontent.com"
}
data "aws_iam_openid_connect_provider" "prod" {
  provider = aws.prod
  arn = "arn:aws:iam::${data.aws_caller_identity.prod.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# Per-account roles for GitHub Actions
resource "aws_iam_role" "gha_dev" {
  provider = aws.dev
  name     = "${var.name_prefix}-gha-dev"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Federated = data.aws_iam_openid_connect_provider.dev.arn },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        StringLike   = { "token.actions.githubusercontent.com:sub": "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main" }
      }
    }]
  })
}
resource "aws_iam_role" "gha_staging" {
  provider = aws.staging
  name     = "${var.name_prefix}-gha-staging"
  assume_role_policy = aws_iam_role.gha_dev.assume_role_policy
}
resource "aws_iam_role" "gha_prod" {
  provider = aws.prod
  name     = "${var.name_prefix}-gha-prod"
  assume_role_policy = aws_iam_role.gha_dev.assume_role_policy
}

# Push/pull policies
locals {
  ecr_actions = [
    "ecr:GetAuthorizationToken","ecr:BatchCheckLayerAvailability","ecr:CompleteLayerUpload",
    "ecr:UploadLayerPart","ecr:InitiateLayerUpload","ecr:PutImage","ecr:BatchGetImage",
    "ecr:DescribeImages","ecr:ListImages"
  ]
}
resource "aws_iam_role_policy" "dev_ecr" {
  provider = aws.dev
  name = "${var.name_prefix}-dev-ecr"
  role = aws_iam_role.gha_dev.id
  policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Action=local.ecr_actions, Resource="*" }] })
}
resource "aws_iam_role_policy" "staging_ecr" {
  provider = aws.staging
  name = "${var.name_prefix}-staging-ecr"
  role = aws_iam_role.gha_staging.id
  policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Action=local.ecr_actions, Resource="*" }] })
}
resource "aws_iam_role_policy" "prod_ecr" {
  provider = aws.prod
  name = "${var.name_prefix}-prod-ecr"
  role = aws_iam_role.gha_prod.id
  policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Action=local.ecr_actions, Resource="*" }] })
}

# Optional: cross-account replication (dev->staging, staging->prod)
resource "aws_ecr_replication_configuration" "staging_replication" {
  provider = aws.dev
  replication_configuration {
    rule {
      destination {
        region      = var.region
        registry_id = data.aws_caller_identity.staging.account_id
      }
      repository_filters { filter = aws_ecr_repository.dev.name, filter_type = "PREFIX" }
    }
  }
}
resource "aws_ecr_replication_configuration" "prod_replication" {
  provider = aws.staging
  replication_configuration {
    rule {
      destination {
        region      = var.region
        registry_id = data.aws_caller_identity.prod.account_id
      }
      repository_filters { filter = aws_ecr_repository.staging.name, filter_type = "PREFIX" }
    }
  }
}

output "dev_repo"     { value = aws_ecr_repository.dev.repository_url }
output "staging_repo" { value = aws_ecr_repository.staging.repository_url }
output "prod_repo"    { value = aws_ecr_repository.prod.repository_url }
output "gha_dev_role_arn"     { value = aws_iam_role.gha_dev.arn }
output "gha_staging_role_arn" { value = aws_iam_role.gha_staging.arn }
output "gha_prod_role_arn"    { value = aws_iam_role.gha_prod.arn }
