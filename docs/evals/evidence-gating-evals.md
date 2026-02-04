# Evidence Gating Evaluation Suite

## Summit Readiness Assertion
This evaluation plan aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Deterministic Evidence Outputs
Each eval emits deterministic `metrics.json` and `report.json` with canonical JSON rules.

## CI Evals
1. **Tamper Resistance**: mutate one byte in SBOM; expect verification failure.
2. **Replay Rejection**: attempt cross-tenant evidence upload; expect denial.
3. **Policy Downgrade Detection**: try weaker policy bundle; expect rejection without exception.
4. **Determinism Repeatability**: same inputs yield identical Evidence ID and metrics.
5. **Ingestion Performance**: ingest N bundles under caps; record p95 latency and error rate.

## Regression Cases
- SBOM missing or format mismatch.
- Provenance missing or wrong predicate type.
- Signatures invalid or untrusted.
- Rollback evidence missing for PS.4 policy.

## Evidence Artifact Emitter
Use a shared emitter to write:
- `evidence/<EVID>/stamp.json`
- `evidence/<EVID>/metrics.json`
- `evidence/<EVID>/report.json`
