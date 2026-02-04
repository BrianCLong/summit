locals {
  signer_release = {
    name            = var.name
    namespace       = var.namespace
    image           = var.image
    bundle_url      = var.bundle_url
    signer_key_id   = var.signer_key_id
    alerts_version  = var.alerts_version
    dashboards_path = var.dashboards_path
  }
}

output "signer_release" {
  description = "Configuration map for the policy signer service, used by Helm and Grafana provisioning."
  value       = local.signer_release
}
