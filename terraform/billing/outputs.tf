output "bucket" { value = aws_s3_bucket.billing.bucket }
output "glue_db" { value = aws_glue_catalog_database.billing.name }
output "athena_workgroup" { value = aws_athena_workgroup.billing.name }
output "metering_sinks" { value = var.metering_sinks }
output "storage_prefix" { value = var.storage_prefix }
output "partition_keys" {
  value = {
    date   = var.date_partition_key
    tenant = var.tenant_partition_key
  }
}
