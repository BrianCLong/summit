terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.region
}

# Add your modules here
# module "service" {
#   source = "../../modules/service"
#   name   = var.service_name
#   ...
# }
