# Terraform configuration for the development environment
# This is a placeholder file.

provider "aws" {
  region = "us-east-1" # Example region
}

resource "aws_s3_bucket" "dev_bucket" {
  bucket = "intelgraph-dev-bucket-${random_string.suffix.result}"
  acl    = "private"

  tags = {
    Environment = "Development"
    Project     = "IntelGraph"
  }
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

output "bucket_name" {
  value = aws_s3_bucket.dev_bucket.bucket
}