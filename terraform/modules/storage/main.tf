# Object Storage Module
# Supports AWS S3, GCP Cloud Storage, and Azure Blob Storage

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# AWS S3 Buckets
# ============================================================================

resource "aws_s3_bucket" "main" {
  count = var.provider == "aws" ? 1 : 0

  bucket = var.bucket_name

  tags = merge(
    var.tags,
    {
      Name        = var.bucket_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

resource "aws_s3_bucket_versioning" "main" {
  count = var.provider == "aws" && var.enable_versioning ? 1 : 0

  bucket = aws_s3_bucket.main[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  count = var.provider == "aws" ? 1 : 0

  bucket = aws_s3_bucket.main[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  count = var.provider == "aws" ? 1 : 0

  bucket = aws_s3_bucket.main[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Object Lock for WORM compliance (audit logs)
resource "aws_s3_bucket_object_lock_configuration" "worm" {
  count = var.provider == "aws" && var.enable_worm ? 1 : 0

  bucket = aws_s3_bucket.main[0].id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = var.worm_retention_days
    }
  }
}

# Lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count = var.provider == "aws" && length(var.lifecycle_rules) > 0 ? 1 : 0

  bucket = aws_s3_bucket.main[0].id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      transition {
        days          = rule.value.transition_days
        storage_class = rule.value.storage_class
      }

      expiration {
        days = rule.value.expiration_days
      }
    }
  }
}

# Backup bucket
resource "aws_s3_bucket" "backup" {
  count = var.provider == "aws" && var.create_backup_bucket ? 1 : 0

  bucket = "${var.bucket_name}-backup"

  tags = merge(
    var.tags,
    {
      Name        = "${var.bucket_name}-backup"
      Environment = var.environment
      Purpose     = "backup"
    }
  )
}

# ============================================================================
# GCP Cloud Storage Buckets
# ============================================================================

resource "google_storage_bucket" "main" {
  count = var.provider == "gcp" ? 1 : 0

  name          = var.bucket_name
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = var.enable_versioning
  }

  encryption {
    default_kms_key_name = var.kms_key_arn
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  labels = merge(
    var.tags,
    {
      environment = var.environment
      managed_by  = "terraform"
    }
  )
}

# Object retention for WORM compliance
resource "google_storage_bucket_object_retention" "worm" {
  count = var.provider == "gcp" && var.enable_worm ? 1 : 0

  bucket = google_storage_bucket.main[0].name

  retention_period {
    retention_duration = "${var.worm_retention_days * 24 * 60 * 60}s"
  }
}

# Backup bucket
resource "google_storage_bucket" "backup" {
  count = var.provider == "gcp" && var.create_backup_bucket ? 1 : 0

  name          = "${var.bucket_name}-backup"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  labels = {
    purpose = "backup"
  }
}

# ============================================================================
# Azure Blob Storage
# ============================================================================

resource "azurerm_storage_account" "main" {
  count = var.provider == "azure" ? 1 : 0

  name                     = replace(var.bucket_name, "-", "")
  resource_group_name      = var.resource_group_name
  location                 = var.region
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"

  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = var.enable_versioning

    delete_retention_policy {
      days = 30
    }
  }

  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }

  tags = merge(
    var.tags,
    {
      environment = var.environment
    }
  )
}

resource "azurerm_storage_container" "main" {
  count = var.provider == "azure" ? 1 : 0

  name                  = var.bucket_name
  storage_account_name  = azurerm_storage_account.main[0].name
  container_access_type = "private"
}

# Immutability policy for WORM compliance
resource "azurerm_storage_account_blob_container_sas" "worm" {
  count = var.provider == "azure" && var.enable_worm ? 1 : 0

  connection_string = azurerm_storage_account.main[0].primary_connection_string
  container_name    = azurerm_storage_container.main[0].name
  https_only        = true

  start  = timestamp()
  expiry = timeadd(timestamp(), "${var.worm_retention_days * 24}h")

  permissions {
    read   = true
    add    = true
    create = true
    write  = false
    delete = false
    list   = true
  }
}

# Backup container
resource "azurerm_storage_container" "backup" {
  count = var.provider == "azure" && var.create_backup_bucket ? 1 : 0

  name                  = "${var.bucket_name}-backup"
  storage_account_name  = azurerm_storage_account.main[0].name
  container_access_type = "private"
}
