variable "region_primary"  { default = "us-east-1" }
variable "region_secondary"{ default = "us-west-2" }
variable "env"             { default = "stage" }
variable "tenant_ids"      { type = list(string) }

provider "aws" { region = var.region_primary  alias = "p" }
provider "aws" { region = var.region_secondary alias = "s" }

# Primary MRK
resource "aws_kms_key" "mrk_primary" {
  provider                = aws.p
  description             = "Conductor MRK primary (${var.env})"
  multi_region            = true
  deletion_window_in_days = 30
  key_usage               = "ENCRYPT_DECRYPT"
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  policy = data.aws_iam_policy_document.kms_key.json
  tags = { env = var.env, service = "crypto", scope = "mrk", role="primary" }
}

# Replica MRK
resource "aws_kms_replica_key" "mrk_replica" {
  provider    = aws.s
  description = "Conductor MRK replica (${var.env})"
  primary_key_arn = aws_kms_key.mrk_primary.arn
  policy      = data.aws_iam_policy_document.kms_key.json
  tags        = { env = var.env, service = "crypto", scope = "mrk", role="replica" }
}

resource "aws_kms_alias" "a_primary" { provider = aws.p  name = "alias/conductor/${var.env}/mrk" target_key_id = aws_kms_key.mrk_primary.key_id }
resource "aws_kms_alias" "a_replica" { provider = aws.s  name = "alias/conductor/${var.env}/mrk" target_key_id = aws_kms_replica_key.mrk_replica.key_id }

# Key policy: app role + breakglass; fine-grained decrypt via EncryptionContext
data "aws_iam_policy_document" "kms_key" {
  statement {
    sid     = "EnableRoot"
    effect  = "Allow"
    principals { type = "AWS" identifiers = ["arn:aws:iam::${data.aws_caller_identity.this.account_id}:root"] }
    actions = ["kms:*"]
    resources = ["*"]
  }
  statement {
    sid     = "AllowAppUse"
    effect  = "Allow"
    principals { type = "AWS" identifiers = [aws_iam_role.app.arn] }
    actions = ["kms:Encrypt","kms:Decrypt","kms:GenerateDataKey*","kms:DescribeKey"]
    resources = ["*"]
    condition {
      test = "ForAllValues:StringEquals"
      variable = "kms:EncryptionContextKeys"
      values = ["tenant","env","purpose"]
    }
    condition {
      test = "StringEquals"
      variable = "kms:EncryptionContext:env"
      values = [var.env]
    }
  }
  statement {
    sid     = "AllowBreakglassDescribe"
    effect  = "Allow"
    principals { type = "AWS" identifiers = [aws_iam_role.breakglass.arn] }
    actions = ["kms:DescribeKey"]
    resources = ["*"]
  }
}

data "aws_caller_identity" "this" {}

resource "aws_iam_role" "app" {
  name = "conductor-${var.env}-app"
  assume_role_policy = jsonencode({
    Version="2012-10-17", Statement=[{Effect="Allow", Principal={Service="ec2.amazonaws.com"}, Action="sts:AssumeRole"}]
  })
}
resource "aws_iam_role" "breakglass" {
  name = "conductor-${var.env}-breakglass"
  assume_role_policy = jsonencode({
    Version="2012-10-17", Statement=[{Effect="Allow", Principal={AWS="arn:aws:iam::${data.aws_caller_identity.this.account_id}:root"}, Action="sts:AssumeRole"}]
  })
}

# Per-tenant grants (bound to EncryptionContext.tenant == <tenant>)
resource "aws_kms_grant" "tenant" {
  for_each      = toset(var.tenant_ids)
  name          = "grant-${var.env}-${each.key}"
  key_id        = aws_kms_key.mrk_primary.key_id
  grantee_principal = aws_iam_role.app.arn
  operations    = ["Encrypt","Decrypt","GenerateDataKey","GenerateDataKeyWithoutPlaintext","DescribeKey"]
  constraints {
    encryption_context_equals = {
      tenant  = each.key
      env     = var.env
    }
  }
}
