# Runbook: Data Spine Ingestion & Audit Materialization

## Symptoms
- Alert: `events_ingested_total` drops or `ingest_failures_total` spikes >1% for 5 minutes.
- Alert: `audit_materialization_lag_seconds` > 900.
- DLQ backlog growing on `cos.authz.decision.v1` or `company.profile_changed.v1` topics.

## Triage Steps
1. **Check producer health**
   - Verify authz gateway and emitting services are up; inspect recent deploys/rollouts.
   - Confirm schema version used by producers matches latest accepted version.
2. **Inspect transport & DLQ**
   - List DLQ messages for failing topic; capture sample payloads.
   - Validate payloads against schemas in `schemas/data-spine/events` using `python -m jsonschema`.
3. **Consumer & sink**
   - Verify ingestion consumer is running; check offsets/lag.
   - Ensure sink storage (S3/warehouse) is writable and not quota blocked.
4. **Audit materialization**
   - Check job logs for `audit-decisions-v1`; confirm last successful watermark.
   - Re-run job for affected partitions; ensure idempotent upsert behavior.

## Remediation
- **Schema drift:** Patch producers to emit compliant payloads; hotfix CI rule if schema is legitimately newer and add reviewed schema.
- **Transport outage:** Failover to secondary brokers; replay from offsets once healthy.
- **DLQ replay:** After fix, replay DLQ batches in order; monitor ingestion lag until backlog clears.
- **Audit lag:** Scale consumer parallelism; temporarily widen partition windows; if needed, backfill from raw sink using job reruns.

## Verification
- Confirm ingestion success rate >99.5% and DLQ backlog cleared.
- Validate audit queries return fresh data for a test tenant and include recent decisions.
- Update incident ticket with root cause, fix, and preventive actions.

## Prevention
- Add canary validation that emits a synthetic allow+deny decision per deploy and asserts they materialize in audit tables.
- Keep schema registry and producers pinned; block releases without schema validation in CI.
