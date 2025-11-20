# DNS Module Outputs

output "zone_id" {
  description = "DNS zone ID"
  value       = var.create_zone ? (
    var.provider == "aws" ? aws_route53_zone.main[0].zone_id : (
      var.provider == "gcp" ? google_dns_managed_zone.main[0].id :
      azurerm_dns_zone.main[0].id
    )
  ) : var.existing_zone_id
}

output "zone_name_servers" {
  description = "Name servers for the DNS zone"
  value       = var.create_zone ? (
    var.provider == "aws" ? aws_route53_zone.main[0].name_servers : (
      var.provider == "gcp" ? google_dns_managed_zone.main[0].name_servers :
      azurerm_dns_zone.main[0].name_servers
    )
  ) : []
}

output "certificate_arn" {
  description = "ARN of the certificate (AWS only)"
  value       = var.provider == "aws" && var.create_certificate ? aws_acm_certificate.main[0].arn : null
}

output "certificate_id" {
  description = "ID of the certificate"
  value       = var.create_certificate ? (
    var.provider == "aws" ? aws_acm_certificate.main[0].id : (
      var.provider == "gcp" ? google_compute_managed_ssl_certificate.main[0].id :
      null
    )
  ) : null
}

output "domain_name" {
  description = "Primary domain name"
  value       = var.domain_name
}

output "cert_manager_issuer" {
  description = "cert-manager ClusterIssuer configuration"
  value       = local.cert_manager_issuer
  sensitive   = false
}
