# NDD Operations Runbook

## Deployment Modes
- **Batch**: Scheduled runs over fixed datasets for deterministic evaluation.
- **Streaming**: Windowed ingestion with periodic evidence artifact emission.

## Monitoring Metrics
- Pipeline lag (p95)
- Determinism failures (non-identical metrics.json)
- Model hash drift
- Alert volume per tenant
- Evidence artifact completion rate

## SLO Targets (Initial)
- Determinism failures: 0 per release.
- Evidence artifact completion: 100% per run.
- Pipeline lag: p95 < 15 minutes (batch), p95 < 5 minutes (streaming).

## Rollback Strategy
- Roll back to last known-good `pipeline_version`.
- Restore pinned model hashes and seed values.
- Re-run fixture determinism checks before re-enabling streaming.

## Artifact Retention & Residency
- Evidence artifacts stored per tenant with retention policy.
- Residency constraints enforced via storage policy; cross-tenant joins require approval.

## CI Checks
- Validate `stamp.json` has required fields: `code_sha`, `data_sha`, `model_sha`, `seed`, `pipeline_version`, `determinism_ok`.
- SBOM generation per release.
