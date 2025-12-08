variable "retention_hot_days" { default = 400 }
variable "retention_years"    { default = 7 }

resource "aws_s3_bucket" "audit_anchors" {
  bucket = "conductor-${var.env}-audit-anchors"
  force_destroy = false
  tags = { env = var.env, service="audit", type="anchors" }
}

resource "aws_s3_bucket_versioning" "audit_anchors" {
  bucket = aws_s3_bucket.audit_anchors.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_anchors" {
  bucket = aws_s3_bucket.audit_anchors.id
  rule {
    id     = "hot-to-cold-then-expire"
    status = "Enabled"

    transition {
      days          = var.retention_hot_days
      storage_class = "DEEP_ARCHIVE"
    }

    expiration { days = var.retention_years * 365 } # ~≥7y
    noncurrent_version_expiration { noncurrent_days = var.retention_years * 365 }
  }
}
