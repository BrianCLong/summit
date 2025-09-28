terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" { type = string  default = "us-east-1" }
variable "github_org" { type = string }
variable "github_repo" { type = string }
variable "subject_filter" {
  description = "OIDC subject filter for GitHub Actions (e.g., repo:org/repo:ref:refs/heads/main)"
  type        = string
}

data "aws_iam_policy_document" "gha_trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [var.subject_filter]
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "inventory_readonly" {
  name               = "InventoryReadOnly"
  assume_role_policy = data.aws_iam_policy_document.gha_trust.json
  description        = "Role assumed by GitHub Actions via OIDC to run inventory (read-only)."
}

data "aws_iam_policy_document" "inventory_read" {
  statement {
    effect = "Allow"
    actions = [
      "organizations:ListAccounts",
      "organizations:DescribeOrganization",
      "iam:ListAccountAliases",
      "sts:GetCallerIdentity"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "inventory_read" {
  name        = "InventoryReadOnlyPolicy"
  description = "Read-only inventory access for org accounts and identity"
  policy      = data.aws_iam_policy_document.inventory_read.json
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.inventory_readonly.name
  policy_arn = aws_iam_policy.inventory_read.arn
}

output "role_arn" { value = aws_iam_role.inventory_readonly.arn }

