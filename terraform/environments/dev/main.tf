# Terraform configuration for the development environment

provider "aws" {
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket         = "summit-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "summit-terraform-locks"
    encrypt        = true
  }
}

module "vpc" {
  source = "../../modules/vpc"

  environment    = "dev"
  cidr_block     = "10.0.0.0/16"
  public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  azs            = ["us-east-1a", "us-east-1b"]
}
