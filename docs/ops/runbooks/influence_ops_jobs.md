# Influence Ops Jobs Runbook

## Scope

Operational runbook for Influence Ops Suite job execution, replay, and incident response.

## SLOs

- **Job determinism**: 100% hash-identical replays for fixed inputs.
- **Evidence completeness**: 100% jobs emit `report.json`, `metrics.json`, `stamp.json`.
- **Policy compliance**: 0 unapproved attribution exports.

## Standard Job Flow

1. Collection (API-first; exceptions require governed approval).
2. Normalization to canonical event schema.
3. Enrichment (language ID, embeddings, temporal signals).
4. Graph analytics (CIB detection, narratives, ER, media signals).
5. HITL checkpoints (attribution, identity resolution).
6. Export (STIX/MISP) with audit stamps.

## Replay Procedure

1. Re-run job with identical inputs and pinned versions.
2. Compare `metrics.json` hash.
3. If mismatch, block export and open incident.

## Backfill Procedure

- Use tenant-scoped replay windows.
- Enforce retention class and region-bound storage.
- Emit evidence bundle per batch.

## Incident Response

- Trigger on determinism failure, policy gate violation, or export anomaly.
- Quarantine affected outputs and issue revocation event.
- Capture evidence bundle and submit to governance review.

## Residency Controls

- Enforce region-bound storage.
- Block cross-region queries unless approved policy exists.

## Offline/Air-Gapped Deployments

- All eval datasets stored internally.
- No external calls in CI.
- Model artifacts fetched only via approved registries.

## Rollback

- Revert to last known-good evidence bundle.
- Disable affected playbooks via policy-as-code gate.
- Restore deterministic replay baseline.
