# Runbooks

## Deployment validation notes

- Confirm metering sinks are configured in Helm values (`helm/summit/values.yaml`) and match the
  intended storage targets before deployment.
- Verify per-tenant partition keys (`ingest_date`, `tenant_id_p` by default) align between Helm
  values and Terraform billing modules.
- Ensure storage prefixes (`parquet/` by default) are consistent across Terraform billing tables
  and Helm metering configuration to avoid split usage data.
