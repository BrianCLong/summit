# Narrative Dominance Technologies Runbook (Defense-Only)

## Scope
Operational guidance for Narrative Intelligence (defensive) under `NARRATIVE_INTEL` feature flag.

## Preconditions
- Feature flag remains OFF by default.
- Tenant allowlist configured and approved.
- Evidence schemas validated and registered.

## Enablement Steps
1. Confirm governance approval and tenant allowlist.
2. Enable `NARRATIVE_INTEL` in staging only.
3. Validate evidence artifacts determinism and schema compliance.
4. Expand to additional tenants after audit review.

## Backfill Procedure
1. Ingest allowlisted sources only.
2. Run clustering pipeline with pinned model version.
3. Generate deterministic evidence artifacts.
4. Verify evidence bundle hashes against manifest.

## Incident Response
### Burst Detector Storms
- Pause ingestion for affected sources.
- Verify rate limits and backpressure.
- Re-run anomaly scoring with capped windows.

### Suspected False Attribution
- Block export pathway immediately.
- Require analyst review and confidence tier downgrade.
- Capture audit notes in case record.

### Suspected Data Leak
- Disable exports and revoke tokens.
- Rotate credentials and validate never-log list.
- Generate evidence bundle for incident review.

## SLO Targets (Staging)
- Clusters available within 5 minutes of ingestion.
- Evidence bundle produced within 2 minutes of cluster completion.

## Rollback Plan
- Disable `NARRATIVE_INTEL` flag.
- Pause ingestion connectors.
- Preserve existing evidence bundles and audit logs.
