provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "Summit"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
