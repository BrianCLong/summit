# DNS and Certificate Management Module
# Supports AWS Route53, GCP Cloud DNS, and Azure DNS

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# AWS Route53
# ============================================================================

resource "aws_route53_zone" "main" {
  count = var.provider == "aws" && var.create_zone ? 1 : 0

  name = var.domain_name

  tags = merge(
    var.tags,
    {
      Name        = var.domain_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# DNS records
resource "aws_route53_record" "records" {
  for_each = var.provider == "aws" ? var.dns_records : {}

  zone_id = var.create_zone ? aws_route53_zone.main[0].zone_id : var.existing_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  count = var.provider == "aws" && var.create_certificate ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = var.san_domains
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    var.tags,
    {
      Name        = var.domain_name
      Environment = var.environment
    }
  )
}

# Certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = var.provider == "aws" && var.create_certificate ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.create_zone ? aws_route53_zone.main[0].zone_id : var.existing_zone_id
}

resource "aws_acm_certificate_validation" "main" {
  count = var.provider == "aws" && var.create_certificate ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ============================================================================
# GCP Cloud DNS
# ============================================================================

resource "google_dns_managed_zone" "main" {
  count = var.provider == "gcp" && var.create_zone ? 1 : 0

  name        = replace(var.domain_name, ".", "-")
  dns_name    = "${var.domain_name}."
  description = "Managed zone for ${var.domain_name}"

  labels = merge(
    var.tags,
    {
      environment = var.environment
      managed_by  = "terraform"
    }
  )
}

# DNS records
resource "google_dns_record_set" "records" {
  for_each = var.provider == "gcp" ? var.dns_records : {}

  name         = "${each.value.name}.${var.domain_name}."
  managed_zone = var.create_zone ? google_dns_managed_zone.main[0].name : var.existing_zone_id
  type         = each.value.type
  ttl          = each.value.ttl
  rrdatas      = each.value.records
}

# Google-managed SSL certificates
resource "google_compute_managed_ssl_certificate" "main" {
  count = var.provider == "gcp" && var.create_certificate ? 1 : 0

  name = replace(var.domain_name, ".", "-")

  managed {
    domains = concat([var.domain_name], var.san_domains)
  }
}

# ============================================================================
# Azure DNS
# ============================================================================

resource "azurerm_dns_zone" "main" {
  count = var.provider == "azure" && var.create_zone ? 1 : 0

  name                = var.domain_name
  resource_group_name = var.resource_group_name

  tags = merge(
    var.tags,
    {
      environment = var.environment
    }
  )
}

# DNS records
resource "azurerm_dns_a_record" "a_records" {
  for_each = var.provider == "azure" ? {
    for k, v in var.dns_records : k => v if v.type == "A"
  } : {}

  name                = each.value.name
  zone_name           = var.create_zone ? azurerm_dns_zone.main[0].name : var.existing_zone_id
  resource_group_name = var.resource_group_name
  ttl                 = each.value.ttl
  records             = each.value.records
}

resource "azurerm_dns_cname_record" "cname_records" {
  for_each = var.provider == "azure" ? {
    for k, v in var.dns_records : k => v if v.type == "CNAME"
  } : {}

  name                = each.value.name
  zone_name           = var.create_zone ? azurerm_dns_zone.main[0].name : var.existing_zone_id
  resource_group_name = var.resource_group_name
  ttl                 = each.value.ttl
  record              = each.value.records[0]
}

# ============================================================================
# cert-manager for Kubernetes (multi-cloud)
# ============================================================================

# Note: cert-manager should be installed via Helm
# This creates the ClusterIssuer for Let's Encrypt

locals {
  cert_manager_issuer = var.enable_cert_manager ? {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-${var.environment}"
    }
    spec = {
      acme = {
        server = var.environment == "prod" ? "https://acme-v02.api.letsencrypt.org/directory" : "https://acme-staging-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = {
          name = "letsencrypt-${var.environment}"
        }
        solvers = [
          {
            dns01 = var.provider == "aws" ? {
              route53 = {
                region = var.region
              }
            } : (
              var.provider == "gcp" ? {
                cloudDNS = {
                  project = var.gcp_project_id
                }
              } : {
                azureDNS = {
                  subscriptionID    = var.azure_subscription_id
                  resourceGroupName = var.resource_group_name
                }
              }
            )
          }
        ]
      }
    }
  } : null
}

output "cert_manager_issuer_manifest" {
  description = "cert-manager ClusterIssuer manifest (apply with kubectl)"
  value       = local.cert_manager_issuer != null ? yamlencode(local.cert_manager_issuer) : null
}
