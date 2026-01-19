# Storage Module
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "main" {
  bucket = "${var.environment}-data-bucket-${random_id.bucket_suffix.hex}"

  tags = {
    Environment = var.environment
  }
}

variable "environment" {
  type        = string
  description = "The environment name"
}
