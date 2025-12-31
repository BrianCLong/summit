# How To: Ingest Data Safely

## Choose a Connector

- Prefer vetted connectors (CSV, RSS/Atom, STIX/TAXII) when available.
- If building a custom connector, keep it in the sandbox policy bundle until reviewed.

## Minimal Ingestion Call

```bash
curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/ingestion/run" \
  -d '{
    "connector_id": "csv-local",
    "source_uri": "s3://tenant-onboarding/data.csv",
    "policy_bundle": "sha256:...",
    "provenance": {"ingestion_idempotency_key": "demo-2025-01-01"}
  }' | jq
```

- Include an idempotency key to avoid duplicate ingestion.
- Keep connectors read-only unless a write path is explicitly required and approved.

## Validate and Monitor

- Inspect ingestion provenance for schema fingerprints and policy decisions.
- Confirm rate limits and budget usage remain within tenant caps.

## Rollback

If ingestion fails validation, mark the batch as quarantined rather than deleting data. Escalate to governance for policy decisions that require new scopes.
