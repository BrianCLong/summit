data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "repo" {
  name = var.repo_name
  image_scanning_configuration { scan_on_push = true }
  image_tag_mutability = "MUTABLE"
  encryption_configuration { encryption_type = "AES256" }
}

# GitHub OIDC provider (global; create once per account if missing)
data "aws_iam_openid_connect_provider" "github" {
  arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# Role for GitHub Actions to assume via OIDC
resource "aws_iam_role" "gha_oidc_role" {
  name = "${var.repo_name}-gha-oidc-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        },
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"
          ]
        }
      }
    }]
  })
}

# ECR push/pull permissions
resource "aws_iam_role_policy" "ecr_push_pull" {
  name = "${var.repo_name}-ecr-push-pull"
  role = aws_iam_role.gha_oidc_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:ListImages"
        ],
        Resource = "*"
      }
    ]
  })
}

output "ecr_repository_url" { value = aws_ecr_repository.repo.repository_url }
output "gha_oidc_role_arn" { value = aws_iam_role.gha_oidc_role.arn }
