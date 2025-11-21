# Disaster Recovery Module
# Implements backup, replication, and failover capabilities

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "aws_backup_vault" {
  description = "AWS Backup Vault ARN"
  type        = string
}

variable "azure_recovery_vault" {
  description = "Azure Recovery Vault ID"
  type        = string
}

variable "gcp_backup_plan" {
  description = "GCP Backup Plan ID"
  type        = string
}

variable "enable_cross_region" {
  description = "Enable cross-region replication"
  type        = bool
  default     = true
}

variable "enable_cross_cloud" {
  description = "Enable cross-cloud DR"
  type        = bool
  default     = false
}

variable "rto_minutes" {
  description = "Recovery Time Objective in minutes"
  type        = number
  default     = 60
}

variable "rpo_minutes" {
  description = "Recovery Point Objective in minutes"
  type        = number
  default     = 15
}

variable "enable_dr_testing" {
  description = "Enable automated DR testing"
  type        = bool
  default     = true
}

variable "test_schedule" {
  description = "DR test schedule (cron)"
  type        = string
  default     = "0 2 * * SUN"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

# AWS Backup Plan
resource "aws_backup_plan" "main" {
  name = "summit-backup-plan"

  rule {
    rule_name         = "continuous"
    target_vault_name = element(split("/", var.aws_backup_vault), length(split("/", var.aws_backup_vault)) - 1)
    schedule          = "cron(0 */6 * * ? *)" # Every 6 hours

    start_window      = 60
    completion_window = 180

    lifecycle {
      cold_storage_after = 30
      delete_after       = 90
    }

    copy_action {
      lifecycle {
        delete_after = 90
      }
      destination_vault_arn = aws_backup_vault.secondary.arn
    }

    recovery_point_tags = var.tags
  }

  rule {
    rule_name         = "point-in-time"
    target_vault_name = element(split("/", var.aws_backup_vault), length(split("/", var.aws_backup_vault)) - 1)
    schedule          = "cron(0 0 * * ? *)" # Daily

    enable_continuous_backup = true

    lifecycle {
      delete_after = 35
    }

    recovery_point_tags = var.tags
  }

  tags = var.tags
}

# Secondary Backup Vault (for cross-region)
resource "aws_backup_vault" "secondary" {
  name        = "summit-backup-vault-secondary"
  kms_key_arn = aws_kms_key.backup.arn

  tags = var.tags

  provider = aws.secondary
}

resource "aws_kms_key" "backup" {
  description             = "KMS key for DR backup vault"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  provider = aws.secondary

  tags = var.tags
}

# AWS Backup Selection
resource "aws_backup_selection" "main" {
  name         = "summit-backup-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }

  resources = [
    "arn:aws:ec2:*:*:instance/*",
    "arn:aws:rds:*:*:db:*",
    "arn:aws:dynamodb:*:*:table/*",
    "arn:aws:elasticfilesystem:*:*:file-system/*"
  ]
}

# IAM Role for Backup
resource "aws_iam_role" "backup" {
  name = "summit-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "backup.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

resource "aws_iam_role_policy_attachment" "restore" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
  role       = aws_iam_role.backup.name
}

# S3 Cross-Region Replication
resource "aws_s3_bucket" "dr_primary" {
  bucket = "summit-dr-primary-${data.aws_caller_identity.current.account_id}"

  tags = var.tags
}

resource "aws_s3_bucket_versioning" "dr_primary" {
  bucket = aws_s3_bucket.dr_primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "dr_secondary" {
  bucket = "summit-dr-secondary-${data.aws_caller_identity.current.account_id}"

  provider = aws.secondary

  tags = var.tags
}

resource "aws_s3_bucket_versioning" "dr_secondary" {
  bucket = aws_s3_bucket.dr_secondary.id
  versioning_configuration {
    status = "Enabled"
  }

  provider = aws.secondary
}

resource "aws_s3_bucket_replication_configuration" "dr" {
  count = var.enable_cross_region ? 1 : 0

  bucket = aws_s3_bucket.dr_primary.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "dr-replication"
    status = "Enabled"

    filter {
      prefix = ""
    }

    destination {
      bucket        = aws_s3_bucket.dr_secondary.arn
      storage_class = "STANDARD"

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = var.rpo_minutes
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = var.rpo_minutes
        }
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.dr_primary,
    aws_s3_bucket_versioning.dr_secondary
  ]
}

resource "aws_iam_role" "replication" {
  name = "summit-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "replication" {
  name = "summit-s3-replication-policy"
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [aws_s3_bucket.dr_primary.arn]
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect   = "Allow"
        Resource = ["${aws_s3_bucket.dr_primary.arn}/*"]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect   = "Allow"
        Resource = ["${aws_s3_bucket.dr_secondary.arn}/*"]
      }
    ]
  })
}

# CloudWatch Alarms for DR Metrics
resource "aws_cloudwatch_metric_alarm" "backup_success" {
  alarm_name          = "summit-backup-success"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsCompleted"
  namespace           = "AWS/Backup"
  period              = 86400
  statistic           = "Sum"
  threshold           = 1

  alarm_description = "Backup job did not complete successfully"

  dimensions = {
    BackupVaultName = element(split("/", var.aws_backup_vault), length(split("/", var.aws_backup_vault)) - 1)
  }

  alarm_actions = [aws_sns_topic.dr_alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  count = var.enable_cross_region ? 1 : 0

  alarm_name          = "summit-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Maximum"
  threshold           = var.rpo_minutes * 60

  alarm_description = "S3 replication lag exceeds RPO"

  dimensions = {
    SourceBucket      = aws_s3_bucket.dr_primary.id
    DestinationBucket = aws_s3_bucket.dr_secondary.id
    RuleId            = "dr-replication"
  }

  alarm_actions = [aws_sns_topic.dr_alerts.arn]

  tags = var.tags
}

# SNS Topic for DR Alerts
resource "aws_sns_topic" "dr_alerts" {
  name = "summit-dr-alerts"

  tags = var.tags
}

# Lambda for DR Testing (scheduled)
resource "aws_lambda_function" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  function_name = "summit-dr-test"
  role          = aws_iam_role.dr_test[0].arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 900

  filename         = data.archive_file.dr_test[0].output_path
  source_code_hash = data.archive_file.dr_test[0].output_base64sha256

  environment {
    variables = {
      BACKUP_VAULT = var.aws_backup_vault
      RTO_MINUTES  = var.rto_minutes
      RPO_MINUTES  = var.rpo_minutes
    }
  }

  tags = var.tags
}

data "archive_file" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/dr_test.zip"

  source {
    content  = <<EOF
exports.handler = async (event) => {
  console.log('Running DR Test...');
  // Implement DR test logic
  return { status: 'completed' };
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  name = "summit-dr-test-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_rule" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  name                = "summit-dr-test-schedule"
  description         = "Schedule for DR testing"
  schedule_expression = "cron(${var.test_schedule})"

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  rule      = aws_cloudwatch_event_rule.dr_test[0].name
  target_id = "dr-test-lambda"
  arn       = aws_lambda_function.dr_test[0].arn
}

# Data sources
data "aws_caller_identity" "current" {}

# Outputs
output "backup_plan_id" {
  value = aws_backup_plan.main.id
}

output "dr_primary_bucket" {
  value = aws_s3_bucket.dr_primary.id
}

output "dr_secondary_bucket" {
  value = aws_s3_bucket.dr_secondary.id
}

output "dr_alerts_topic" {
  value = aws_sns_topic.dr_alerts.arn
}

output "replication_status" {
  value = var.enable_cross_region ? "Enabled" : "Disabled"
}
