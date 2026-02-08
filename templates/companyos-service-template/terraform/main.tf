terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Add your resources here
# module "service" {
#   source = "../../terraform/modules/service"
#   name   = var.service_name
#   ...
# }
