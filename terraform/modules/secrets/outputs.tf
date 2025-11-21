# Secrets Module Outputs

output "secret_ids" {
  description = "IDs of created secrets"
  value       = var.provider == "aws" ? { for k, v in aws_secretsmanager_secret.secrets : k => v.id } : (
    var.provider == "gcp" ? { for k, v in google_secret_manager_secret.secrets : k => v.id } :
    { for k, v in azurerm_key_vault_secret.secrets : k => v.id }
  )
}

output "secret_arns" {
  description = "ARNs of created secrets (AWS only)"
  value       = var.provider == "aws" ? { for k, v in aws_secretsmanager_secret.secrets : k => v.arn } : null
}

output "key_vault_uri" {
  description = "Key Vault URI (Azure only)"
  value       = var.provider == "azure" ? azurerm_key_vault.main[0].vault_uri : null
}

output "external_secrets_installed" {
  description = "Whether External Secrets Operator is installed"
  value       = var.install_external_secrets
}

output "secret_store_name" {
  description = "Name of the SecretStore"
  value       = var.install_external_secrets ? "${var.environment}-secret-store" : null
}

output "iam_policy_arn" {
  description = "IAM policy ARN for External Secrets (AWS only)"
  value       = var.provider == "aws" && var.install_external_secrets ? aws_iam_policy.external_secrets[0].arn : null
}
