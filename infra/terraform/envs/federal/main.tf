# Federal WORM Buckets - 20 Year Retention for All Audit Data
# Deploys all five federal compliance buckets with Object Lock

# KMS key for WORM bucket encryption
resource "aws_kms_key" "worm_encryption_key" {
  description             = "KMS key for IntelGraph Federal WORM storage encryption"
  deletion_window_in_days = 30
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM Root Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Federal Services"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphFederalRole",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphAuditRole"
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name         = "IntelGraph Federal WORM Encryption Key"
    Purpose      = "WORM Storage Encryption"
    Compliance   = "FedRAMP High"
    Environment  = "Federal"
  }
}

resource "aws_kms_alias" "worm_encryption_key_alias" {
  name          = "alias/intelgraph-federal-worm"
  target_key_id = aws_kms_key.worm_encryption_key.key_id
}

# SNS topic for compliance notifications
resource "aws_sns_topic" "compliance_notifications" {
  name         = "intelgraph-federal-compliance"
  display_name = "IntelGraph Federal Compliance Notifications"
  
  kms_master_key_id = aws_kms_key.worm_encryption_key.key_id

  tags = {
    Name        = "IntelGraph Federal Compliance"
    Purpose     = "Compliance Event Notifications"
    Environment = "Federal"
  }
}

# CloudTrail bucket for access logging
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket        = "intelgraph-federal-cloudtrail-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = {
    Name        = "IntelGraph Federal CloudTrail"
    Purpose     = "Access Logging"
    Environment = "Federal"
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail_versioning" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Data source for current account
data "aws_caller_identity" "current" {}

# Module instantiation for all five federal WORM buckets
module "worm_audit_bucket" {
  source = "../../modules/worm_bucket"
  
  bucket_name       = "intelgraph-federal-audit-${random_id.bucket_suffix.hex}"
  kms_key_arn       = aws_kms_key.worm_encryption_key.arn
  retention_years   = 20
  classification    = "UNCLASSIFIED"
  legal_hold_enabled = true
  
  federal_org_id = var.federal_org_id
  federal_service_principals = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphFederalRole",
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphAuditRole"
  ]
  
  compliance_sns_topic_arn = aws_sns_topic.compliance_notifications.arn
  access_log_bucket       = aws_s3_bucket.cloudtrail_logs.id
}

module "worm_billing_bucket" {
  source = "../../modules/worm_bucket"
  
  bucket_name       = "intelgraph-federal-billing-${random_id.bucket_suffix.hex}"
  kms_key_arn       = aws_kms_key.worm_encryption_key.arn
  retention_years   = 20
  classification    = "UNCLASSIFIED"
  legal_hold_enabled = true
  
  federal_org_id = var.federal_org_id
  federal_service_principals = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphFederalRole"
  ]
  
  compliance_sns_topic_arn = aws_sns_topic.compliance_notifications.arn
  access_log_bucket       = aws_s3_bucket.cloudtrail_logs.id
}

module "worm_event_bucket" {
  source = "../../modules/worm_bucket"
  
  bucket_name       = "intelgraph-federal-event-${random_id.bucket_suffix.hex}"
  kms_key_arn       = aws_kms_key.worm_encryption_key.arn
  retention_years   = 20
  classification    = "UNCLASSIFIED"
  legal_hold_enabled = true
  
  federal_org_id = var.federal_org_id
  federal_service_principals = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphFederalRole"
  ]
  
  compliance_sns_topic_arn = aws_sns_topic.compliance_notifications.arn
  access_log_bucket       = aws_s3_bucket.cloudtrail_logs.id
}

module "worm_breakglass_bucket" {
  source = "../../modules/worm_bucket"
  
  bucket_name       = "intelgraph-federal-breakglass-${random_id.bucket_suffix.hex}"
  kms_key_arn       = aws_kms_key.worm_encryption_key.arn
  retention_years   = 20
  classification    = "CONFIDENTIAL"  # Higher classification for break-glass logs
  legal_hold_enabled = true
  
  federal_org_id = var.federal_org_id
  federal_service_principals = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphFederalRole",
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphSecurityRole"
  ]
  
  compliance_sns_topic_arn = aws_sns_topic.compliance_notifications.arn
  access_log_bucket       = aws_s3_bucket.cloudtrail_logs.id
}

module "worm_compliance_bucket" {
  source = "../../modules/worm_bucket"
  
  bucket_name       = "intelgraph-federal-compliance-${random_id.bucket_suffix.hex}"
  kms_key_arn       = aws_kms_key.worm_encryption_key.arn
  retention_years   = 20
  classification    = "UNCLASSIFIED"
  legal_hold_enabled = true
  
  federal_org_id = var.federal_org_id
  federal_service_principals = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphFederalRole",
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/IntelGraphComplianceRole"
  ]
  
  compliance_sns_topic_arn = aws_sns_topic.compliance_notifications.arn
  access_log_bucket       = aws_s3_bucket.cloudtrail_logs.id
}

# Variables
variable "federal_org_id" {
  description = "AWS Organization ID for federal account access"
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "federal"
}

# Outputs for application configuration
output "federal_buckets" {
  description = "All federal WORM bucket configurations"
  value = {
    audit = {
      name   = module.worm_audit_bucket.bucket_name
      arn    = module.worm_audit_bucket.bucket_arn
    }
    billing = {
      name   = module.worm_billing_bucket.bucket_name
      arn    = module.worm_billing_bucket.bucket_arn
    }
    event = {
      name   = module.worm_event_bucket.bucket_name
      arn    = module.worm_event_bucket.bucket_arn
    }
    breakglass = {
      name   = module.worm_breakglass_bucket.bucket_name
      arn    = module.worm_breakglass_bucket.bucket_arn
    }
    compliance = {
      name   = module.worm_compliance_bucket.bucket_name
      arn    = module.worm_compliance_bucket.bucket_arn
    }
  }
}

output "kms_key" {
  description = "KMS key for WORM encryption"
  value = {
    arn   = aws_kms_key.worm_encryption_key.arn
    alias = aws_kms_alias.worm_encryption_key_alias.name
  }
}

output "compliance_topic" {
  description = "SNS topic for compliance notifications"
  value = {
    arn  = aws_sns_topic.compliance_notifications.arn
    name = aws_sns_topic.compliance_notifications.name
  }
}