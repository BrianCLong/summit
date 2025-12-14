Billing Data Lake (Parquet + Glue + Athena)

- Bucket: writes usage to `s3://<billing-bucket>/parquet/ingest_date=YYYY-MM-DD/tenant_id=<id>/...`.
- Table: Glue catalog table `usage_events` over the Parquet prefix.
- Query: Athena workgroup configured with results bucket.

Deploy

- Variables: set `region`, `billing_bucket`, and `athena_results_bucket`.
- Commands:
  - `terraform init`
  - `terraform apply -var="region=us-east-1" -var="billing_bucket=intelgraph-billing-<uniq>" -var="athena_results_bucket=intelgraph-athena-results-<uniq>"`

Writing Events

- Server provides `writeUsageParquet(...)` in `server/src/billing/sink.ts`.
- Env: set `BILLING_BUCKET` for S3 target. If `parquetjs-lite` is not installed, it will fall back to JSON under the same Parquet prefix (Glue crawler can reclassify later).

Schema

- Columns: `ts TIMESTAMP`, `tenant_id STRING`, `user_id STRING`, `action STRING`, `quantity INT`, `metadata STRING`.
- Partitions: `ingest_date STRING`, `tenant_id_p STRING` (logical: `tenant_id` in path).

Athena Examples

- `MSCK REPAIR TABLE usage_events;`
- `SELECT tenant_id, action, sum(quantity) AS qty FROM usage_events WHERE ingest_date BETWEEN '2025-09-01' AND '2025-09-30' GROUP BY 1,2 ORDER BY qty DESC;`

End-to-End Verify

- Apply module → export one event using `writeUsageParquet` → run `MSCK REPAIR TABLE` → query in Athena.
