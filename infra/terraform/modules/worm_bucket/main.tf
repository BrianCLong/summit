# WORM Bucket Module for 20-Year Federal Compliance
# Implements S3 Object Lock with KMS encryption for audit retention

variable "bucket_name" {
  description = "Name of the WORM-compliant S3 bucket"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be valid S3 bucket name format."
  }
}

variable "kms_key_arn" {
  description = "ARN of KMS key for bucket encryption"
  type        = string
  validation {
    condition     = can(regex("^arn:aws:kms:", var.kms_key_arn))
    error_message = "Must be a valid KMS key ARN."
  }
}

variable "retention_years" {
  description = "Object Lock retention period in years"
  type        = number
  default     = 20
  validation {
    condition     = var.retention_years >= 1 && var.retention_years <= 100
    error_message = "Retention years must be between 1 and 100."
  }
}

variable "classification" {
  description = "Data classification level for tagging"
  type        = string
  default     = "UNCLASSIFIED"
  validation {
    condition     = contains(["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP_SECRET"], var.classification)
    error_message = "Classification must be a valid security level."
  }
}

variable "legal_hold_enabled" {
  description = "Enable legal hold capability"
  type        = bool
  default     = true
}

# Main S3 bucket with Object Lock enabled
resource "aws_s3_bucket" "worm_bucket" {
  bucket              = var.bucket_name
  object_lock_enabled = true
  force_destroy       = false

  tags = {
    Name            = var.bucket_name
    Purpose         = "WORM Audit Storage"
    Classification  = var.classification
    Retention       = "${var.retention_years} years"
    Compliance      = "FedRAMP High"
    ManagedBy       = "Terraform"
    Environment     = "Federal"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning (required for Object Lock)
resource "aws_s3_bucket_versioning" "worm_versioning" {
  bucket = aws_s3_bucket.worm_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configure Object Lock with COMPLIANCE mode
resource "aws_s3_bucket_object_lock_configuration" "worm_lock" {
  bucket                = aws_s3_bucket.worm_bucket.id
  expected_bucket_owner = data.aws_caller_identity.current.account_id

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = var.retention_years
    }
  }

  # Optional: Enable legal hold by default for certain paths
  dynamic "rule" {
    for_each = var.legal_hold_enabled ? [1] : []
    content {
      default_retention {
        mode = "GOVERNANCE"
        days = 1
      }
    }
  }
}

# Server-side encryption with customer-managed KMS key
resource "aws_s3_bucket_server_side_encryption_configuration" "worm_encryption" {
  bucket = aws_s3_bucket.worm_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "worm_public_access_block" {
  bucket = aws_s3_bucket.worm_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle configuration for intelligent tiering and glacier transition
resource "aws_s3_bucket_lifecycle_configuration" "worm_lifecycle" {
  bucket = aws_s3_bucket.worm_bucket.id

  rule {
    id     = "federal_audit_lifecycle"
    status = "Enabled"

    # Move to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Move to Deep Archive after 1 year
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # Apply to all objects
    filter {}
  }

  # Separate rule for audit segments (more aggressive archival)
  rule {
    id     = "audit_segments_lifecycle"
    status = "Enabled"

    filter {
      prefix = "audit-segments/"
    }

    transition {
      days          = 7
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    transition {
      days          = 90
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

# Notification configuration for compliance monitoring
resource "aws_s3_bucket_notification" "worm_notifications" {
  bucket = aws_s3_bucket.worm_bucket.id

  # Notify on object creation
  topic {
    topic_arn = var.compliance_sns_topic_arn
    events    = ["s3:ObjectCreated:*"]
  }

  # Notify on retention changes
  topic {
    topic_arn = var.compliance_sns_topic_arn
    events    = ["s3:ObjectRetention:*"]
  }

  depends_on = [aws_sns_topic_policy.compliance_topic_policy]
}

# CloudTrail integration for Object Lock events
resource "aws_s3_bucket_logging" "worm_access_logging" {
  bucket = aws_s3_bucket.worm_bucket.id

  target_bucket = var.access_log_bucket
  target_prefix = "worm-access-logs/${var.bucket_name}/"
}

# Bucket policy for federal compliance access patterns
resource "aws_s3_bucket_policy" "worm_policy" {
  bucket = aws_s3_bucket.worm_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureConnections"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.worm_bucket.arn,
          "${aws_s3_bucket.worm_bucket.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "RequireFederalAccess"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.worm_bucket.arn,
          "${aws_s3_bucket.worm_bucket.arn}/*"
        ]
        Condition = {
          StringNotEquals = {
            "aws:PrincipalOrgID" = var.federal_org_id
          }
        }
      },
      {
        Sid    = "AllowFederalServiceAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.federal_service_principals
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObjectLegalHold",
          "s3:GetObjectLegalHold",
          "s3:PutObjectRetention",
          "s3:GetObjectRetention"
        ]
        Resource = [
          aws_s3_bucket.worm_bucket.arn,
          "${aws_s3_bucket.worm_bucket.arn}/*"
        ]
        Condition = {
          StringEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
            "s3:x-amz-server-side-encryption-aws-kms-key-id" = var.kms_key_arn
          }
        }
      }
    ]
  })
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Variables for bucket policy
variable "federal_org_id" {
  description = "AWS Organization ID for federal account access"
  type        = string
  default     = null
}

variable "federal_service_principals" {
  description = "List of federal service principal ARNs allowed access"
  type        = list(string)
  default     = []
}

variable "compliance_sns_topic_arn" {
  description = "SNS topic ARN for compliance notifications"
  type        = string
  default     = null
}

variable "access_log_bucket" {
  description = "S3 bucket for access logging"
  type        = string
  default     = null
}

# Outputs
output "bucket_name" {
  description = "Name of the created WORM bucket"
  value       = aws_s3_bucket.worm_bucket.id
}

output "bucket_arn" {
  description = "ARN of the created WORM bucket"
  value       = aws_s3_bucket.worm_bucket.arn
}

output "bucket_domain_name" {
  description = "Bucket domain name"
  value       = aws_s3_bucket.worm_bucket.bucket_domain_name
}

output "object_lock_configuration" {
  description = "Object Lock configuration details"
  value = {
    retention_mode  = "COMPLIANCE"
    retention_years = var.retention_years
    legal_hold      = var.legal_hold_enabled
  }
}

output "encryption_configuration" {
  description = "Encryption configuration details"
  value = {
    sse_algorithm = "aws:kms"
    kms_key_arn   = var.kms_key_arn
  }
}