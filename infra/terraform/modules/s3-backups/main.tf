terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.55"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "backups" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = merge(
    {
      Purpose              = "backup"
      TenantPartitioning   = var.tenant_partitioning_enabled ? "enabled" : "disabled"
      TenantTagKey         = var.tenant_tag_key
    },
    var.tags,
  )
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    expiration {
      days = var.expiration_days
    }
  }
}

# Require tenant tagging on all backup object PUT operations
data "aws_iam_policy_document" "tenant_tag_enforcement" {
  statement {
    sid    = "RequireTenantTagOnUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:PutObject"]
    resources = [
      "${aws_s3_bucket.backups.arn}/*",
    ]

    condition {
      test     = "Null"
      variable = "s3:RequestObjectTag/${var.tenant_tag_key}"
      values   = ["true"]
    }
  }
}

resource "aws_s3_bucket_policy" "tenant_tag_enforcement" {
  bucket = aws_s3_bucket.backups.id
  policy = data.aws_iam_policy_document.tenant_tag_enforcement.json
}

output "bucket_name" {
  value = aws_s3_bucket.backups.bucket
}
