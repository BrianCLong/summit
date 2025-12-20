# Terraform configuration for the staging environment
# This is a placeholder file.

provider "aws" {
  region = "us-east-1" # Example region
}

resource "aws_s3_bucket" "staging_bucket" {
  bucket = "intelgraph-staging-bucket-${random_string.suffix.result}"
  acl    = "private"

  tags = {
    Environment = "Staging"
    Project     = "IntelGraph"
  }
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

output "bucket_name" {
  value = aws_s3_bucket.staging_bucket.bucket
}