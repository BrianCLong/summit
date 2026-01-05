variable "region" { type = string }
variable "billing_bucket" { type = string }
variable "enable_object_lock" { type = bool default = true }
variable "retention_days" { type = number default = 365 }
variable "glue_db" { type = string default = "intelgraph_billing" }
variable "athena_workgroup" { type = string default = "intelgraph-billing" }
variable "athena_results_bucket" { type = string }
variable "metering_sinks" { type = list(string) default = ["s3"] }
variable "storage_prefix" { type = string default = "parquet/" }
variable "date_partition_key" { type = string default = "ingest_date" }
variable "tenant_partition_key" { type = string default = "tenant_id_p" }
