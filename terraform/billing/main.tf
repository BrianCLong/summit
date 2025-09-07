terraform {
  required_providers { aws = { source = "hashicorp/aws", version = ">= 5.0" } }
}
provider "aws" { region = var.region }

resource "aws_s3_bucket" "billing" {
  bucket = var.billing_bucket
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "v" {
  bucket = aws_s3_bucket.billing.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_object_lock_configuration" "lock" {
  count  = var.enable_object_lock ? 1 : 0
  bucket = aws_s3_bucket.billing.id
  rule { default_retention { mode = "COMPLIANCE", days = var.retention_days } }
}

resource "aws_glue_catalog_database" "billing" { name = var.glue_db }

resource "aws_glue_catalog_table" "usage_events" {
  database_name = aws_glue_catalog_database.billing.name
  name          = "usage_events"
  table_type    = "EXTERNAL_TABLE"
  parameters    = { classification = "parquet", "projection.enabled" = "true" }
  storage_descriptor {
    location      = "s3://${var.billing_bucket}/parquet/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
    ser_de_info   = { name = "parquet", serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe" }
    columns = [
      { name = "ts",        type = "timestamp" },
      { name = "tenant_id", type = "string" },
      { name = "user_id",   type = "string" },
      { name = "action",    type = "string" },
      { name = "quantity",  type = "int"    },
      { name = "metadata",  type = "string" }
    ]
  }
  partition_keys = [{ name = "ingest_date", type = "string" }, { name = "tenant_id_p", type = "string" }]
}

resource "aws_athena_workgroup" "billing" {
  name = var.athena_workgroup
  configuration {
    enforce_workgroup_configuration = true
    result_configuration { output_location = "s3://${var.athena_results_bucket}/" }
  }
}
