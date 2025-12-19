module "signer_service" {
  source                 = "./modules/signer-service"
  environment            = var.environment
  signer_name            = "mc-platform-signer"
  policy_bundle_bucket   = var.policy_bundle_bucket
  policy_bundle_source   = var.policy_bundle_source
  policy_bundle_checksum = var.policy_bundle_checksum
  dashboard_bucket       = var.dashboard_bucket
  signer_dashboard_json  = file("${path.module}/../grafana/dashboards/signer-service.json")
  alert_topic_arn        = var.alert_topic_arn
}
