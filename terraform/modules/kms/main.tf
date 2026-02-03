locals {
  merged_tags = merge(var.tags, {
    Name        = "${var.environment}-${var.name}"
    Environment = var.environment
  })
}

data "aws_iam_policy_document" "default" {
  dynamic "statement" {
    for_each = length(var.key_admin_arns) > 0 ? [1] : []
    content {
      sid    = "KmsAdmins"
      effect = "Allow"
      principals {
        type        = "AWS"
        identifiers = var.key_admin_arns
      }
      actions   = ["kms:*"]
      resources = ["*"]
    }
  }

  dynamic "statement" {
    for_each = length(var.key_user_arns) > 0 ? [1] : []
    content {
      sid    = "KmsUsage"
      effect = "Allow"
      principals {
        type        = "AWS"
        identifiers = var.key_user_arns
      }
      actions = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ]
      resources = ["*"]
    }
  }
}

resource "aws_kms_key" "this" {
  description             = coalesce(var.description, "${var.name} managed by Terraform")
  enable_key_rotation     = var.enable_key_rotation
  deletion_window_in_days = var.deletion_window_in_days
  policy                  = coalesce(var.policy, data.aws_iam_policy_document.default.json)
  tags                    = local.merged_tags
}

resource "aws_kms_alias" "this" {
  for_each      = toset(var.aliases)
  name          = each.value
  target_key_id = aws_kms_key.this.key_id
}
