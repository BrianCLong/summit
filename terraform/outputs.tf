output "signer_kms_key_arn" {
  description = "ARN of the signer KMS key."
  value       = module.signer_kms.key_arn
}

output "signer_kms_alias" {
  description = "Alias ARN for the signer KMS key."
  value       = module.signer_kms.alias_arn
}

output "policy_bundle_bucket" {
  description = "Bucket used to store policy bundles and dashboards."
  value       = module.policy_bundle_bucket.bucket_id
}

output "observability_dashboard_name" {
  description = "Provisioned CloudWatch dashboard name."
  value       = module.observability_dashboard.dashboard_name
}

output "alert_topic_arn" {
  description = "SNS topic ARN used for dashboard-related alerts."
  value       = module.observability_dashboard.alert_topic_arn
}
