terraform {
  backend "s3" {}
}

module "iam" {
  source = "../../infra/modules/iam"
  environment = var.environment
}

module "network" {
  source = "../../infra/modules/network"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

module "compute" {
  source = "../../infra/modules/compute"
  environment      = var.environment
  cluster_role_arn = module.iam.cluster_role_arn
  node_role_arn    = module.iam.node_role_arn
  subnet_ids       = module.network.subnet_ids
}

module "storage" {
  source = "../../infra/modules/storage"
  environment = var.environment
}

module "secrets" {
  source = "../../infra/modules/secrets"
  environment = var.environment
}

variable "environment" {}
variable "vpc_cidr" {}
