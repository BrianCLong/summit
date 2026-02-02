locals {
  tags = merge(
    {
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )

  bundle_bucket_name = var.bundle_bucket_name != "" ? var.bundle_bucket_name : "${var.environment}-intelgraph-bundles"
}

module "signer_kms" {
  source = "./modules/kms"

  alias                   = "${var.environment}-signer"
  description             = "KMS key for signer tokens and policy bundles"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.tags
}

module "policy_bundle_bucket" {
  source = "./modules/config-bucket"

  bucket_name   = local.bundle_bucket_name
  kms_key_arn   = module.signer_kms.key_arn
  force_destroy = false
  tags          = local.tags
}

module "observability_dashboard" {
  source = "./modules/observability-dashboard"

  dashboard_name    = "${var.environment}-signer-observability"
  region            = var.region
  metrics_namespace = var.metrics_namespace
  create_sns_topic  = true
  tags              = local.tags
}
