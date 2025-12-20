output "bucket" { value = aws_s3_bucket.billing.bucket }
output "glue_db" { value = aws_glue_catalog_database.billing.name }
output "athena_workgroup" { value = aws_athena_workgroup.billing.name }
