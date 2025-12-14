# Secrets Management Module
# Supports AWS Secrets Manager, GCP Secret Manager, and Azure Key Vault
# Includes External Secrets Operator configuration

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
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# ============================================================================
# AWS Secrets Manager
# ============================================================================

resource "aws_secretsmanager_secret" "secrets" {
  for_each = var.provider == "aws" ? var.secrets : {}

  name        = "${var.environment}/${each.key}"
  description = each.value.description

  kms_key_id = var.kms_key_arn

  tags = merge(
    var.tags,
    {
      Name        = each.key
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

resource "aws_secretsmanager_secret_version" "secrets" {
  for_each = var.provider == "aws" ? var.secrets : {}

  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = jsonencode(each.value.data)
}

# Secret rotation configuration
resource "aws_secretsmanager_secret_rotation" "secrets" {
  for_each = var.provider == "aws" ? {
    for k, v in var.secrets : k => v if v.rotation_enabled
  } : {}

  secret_id           = aws_secretsmanager_secret.secrets[each.key].id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = each.value.rotation_days
  }
}

# IAM policy for External Secrets Operator
resource "aws_iam_policy" "external_secrets" {
  count = var.provider == "aws" && var.install_external_secrets ? 1 : 0

  name        = "${var.environment}-external-secrets-policy"
  description = "Policy for External Secrets Operator to access AWS Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# GCP Secret Manager
# ============================================================================

resource "google_secret_manager_secret" "secrets" {
  for_each = var.provider == "gcp" ? var.secrets : {}

  secret_id = "${var.environment}-${each.key}"

  replication {
    automatic = true
  }

  labels = merge(
    var.tags,
    {
      environment = var.environment
      managed_by  = "terraform"
    }
  )
}

resource "google_secret_manager_secret_version" "secrets" {
  for_each = var.provider == "gcp" ? var.secrets : {}

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = jsonencode(each.value.data)
}

# IAM binding for External Secrets Operator
resource "google_secret_manager_secret_iam_member" "external_secrets" {
  for_each = var.provider == "gcp" && var.install_external_secrets ? var.secrets : {}

  secret_id = google_secret_manager_secret.secrets[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.service_account_email}"
}

# ============================================================================
# Azure Key Vault
# ============================================================================

resource "azurerm_key_vault" "main" {
  count = var.provider == "azure" ? 1 : 0

  name                = "${var.environment}-kv"
  location            = var.region
  resource_group_name = var.resource_group_name
  tenant_id           = var.azure_tenant_id
  sku_name            = "standard"

  enabled_for_deployment          = true
  enabled_for_disk_encryption     = true
  enabled_for_template_deployment = true
  purge_protection_enabled        = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }

  tags = merge(
    var.tags,
    {
      environment = var.environment
    }
  )
}

resource "azurerm_key_vault_secret" "secrets" {
  for_each = var.provider == "azure" ? var.secrets : {}

  name         = each.key
  value        = jsonencode(each.value.data)
  key_vault_id = azurerm_key_vault.main[0].id

  tags = {
    description = each.value.description
  }
}

# Access policy for External Secrets Operator
resource "azurerm_key_vault_access_policy" "external_secrets" {
  count = var.provider == "azure" && var.install_external_secrets ? 1 : 0

  key_vault_id = azurerm_key_vault.main[0].id
  tenant_id    = var.azure_tenant_id
  object_id    = var.azure_service_principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# ============================================================================
# External Secrets Operator Installation
# ============================================================================

resource "helm_release" "external_secrets" {
  count = var.install_external_secrets ? 1 : 0

  name       = "external-secrets"
  repository = "https://charts.external-secrets.io"
  chart      = "external-secrets"
  version    = var.external_secrets_version
  namespace  = "external-secrets"

  create_namespace = true

  values = [
    yamlencode({
      installCRDs = true

      webhook = {
        port = 9443
      }

      certController = {
        requeueInterval = "5m"
      }
    })
  ]

  depends_on = [
    aws_iam_policy.external_secrets,
    google_secret_manager_secret_iam_member.external_secrets,
    azurerm_key_vault_access_policy.external_secrets
  ]
}

# ============================================================================
# SecretStore Configuration
# ============================================================================

locals {
  secret_store = var.install_external_secrets ? {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "SecretStore"
    metadata = {
      name      = "${var.environment}-secret-store"
      namespace = var.kubernetes_namespace
    }
    spec = var.provider == "aws" ? {
      provider = {
        aws = {
          service = "SecretsManager"
          region  = var.region
          auth = {
            jwt = {
              serviceAccountRef = {
                name = "external-secrets-sa"
              }
            }
          }
        }
      }
    } : (
      var.provider == "gcp" ? {
        provider = {
          gcpsm = {
            projectID = var.gcp_project_id
            auth = {
              workloadIdentity = {
                clusterLocation    = var.region
                clusterName        = var.cluster_name
                serviceAccountRef = {
                  name = "external-secrets-sa"
                }
              }
            }
          }
        }
      } : {
        provider = {
          azurekv = {
            authType  = "ServicePrincipal"
            vaultUrl  = azurerm_key_vault.main[0].vault_uri
            tenantId  = var.azure_tenant_id
            authSecretRef = {
              clientId = {
                name = "azure-credentials"
                key  = "client-id"
              }
              clientSecret = {
                name = "azure-credentials"
                key  = "client-secret"
              }
            }
          }
        }
      }
    )
  } : null
}

output "secret_store_manifest" {
  description = "SecretStore manifest for External Secrets Operator"
  value       = local.secret_store != null ? yamlencode(local.secret_store) : null
}

# ============================================================================
# Example ExternalSecret
# ============================================================================

locals {
  example_external_secret = var.install_external_secrets && var.create_example ? {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ExternalSecret"
    metadata = {
      name      = "app-secrets"
      namespace = var.kubernetes_namespace
    }
    spec = {
      refreshInterval = "1h"
      secretStoreRef = {
        name = "${var.environment}-secret-store"
        kind = "SecretStore"
      }
      target = {
        name           = "app-secrets"
        creationPolicy = "Owner"
      }
      data = [
        for secret_key in keys(var.secrets) : {
          secretKey = secret_key
          remoteRef = {
            key = "${var.environment}/${secret_key}"
          }
        }
      ]
    }
  } : null
}

output "example_external_secret_manifest" {
  description = "Example ExternalSecret manifest"
  value       = local.example_external_secret != null ? yamlencode(local.example_external_secret) : null
}
