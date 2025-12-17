# Storage Module Outputs

output "bucket_name" {
  description = "Name of the storage bucket"
  value       = var.bucket_name
}

output "bucket_id" {
  description = "ID of the storage bucket"
  value       = var.provider == "aws" ? aws_s3_bucket.main[0].id : (
    var.provider == "gcp" ? google_storage_bucket.main[0].name :
    azurerm_storage_container.main[0].id
  )
}

output "bucket_arn" {
  description = "ARN of the storage bucket (AWS only)"
  value       = var.provider == "aws" ? aws_s3_bucket.main[0].arn : null
}

output "bucket_url" {
  description = "URL of the storage bucket"
  value       = var.provider == "aws" ? "s3://${aws_s3_bucket.main[0].id}" : (
    var.provider == "gcp" ? "gs://${google_storage_bucket.main[0].name}" :
    "https://${azurerm_storage_account.main[0].name}.blob.core.windows.net/${azurerm_storage_container.main[0].name}"
  )
}

output "backup_bucket_name" {
  description = "Name of the backup bucket"
  value       = var.create_backup_bucket ? (
    var.provider == "aws" ? aws_s3_bucket.backup[0].id : (
      var.provider == "gcp" ? google_storage_bucket.backup[0].name :
      azurerm_storage_container.backup[0].name
    )
  ) : null
}

output "region" {
  description = "Region where bucket is located"
  value       = var.region
}

output "versioning_enabled" {
  description = "Whether versioning is enabled"
  value       = var.enable_versioning
}

output "worm_enabled" {
  description = "Whether WORM compliance is enabled"
  value       = var.enable_worm
}
