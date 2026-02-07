# NarrativeOps Ops Runbook (Air-Gapped + Multi-Tenant)

## Summit Readiness Assertion
Operational procedures are aligned with the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) and GA readiness gates.

## Deployment Modes
- **Air-gapped**: offline weights and fixtures, no external network access.
- **Multi-tenant**: per-tenant encryption, isolated indexes, and strict ACLs.

## CLI Usage (Deterministic)
```
# Run a deterministic NarrativeOps pipeline
narops-cli run \
  --input <input_manifest.json> \
  --eid EID-NAROPS-YYYYMMDD-stage-0001 \
  --seed 42 \
  --sort-mode stable_by_id_then_time \
  --output evidence/<EID>/
```

## Required Artifacts
- `report.json`
- `metrics.json`
- `stamp.json`

## Monitoring & Alerts
**Metrics** (minimum):
- Cluster stability score
- Community churn rate
- Strategy label drift
- Impact calibration error
- Evidence gate failures

**Alerts** (examples):
- Cluster stability drops below threshold for 2 consecutive windows.
- Community churn spikes above baseline by 3σ.
- Evidence gate failure > 0 in last 24 hours.

## Incident Runbooks
### 1) False Positive Storm
1. Freeze current pipeline outputs.
2. Re-run determinism gate with the same input manifest.
3. Compare `stamp.json` hashes for deviations.
4. Roll back to last known-good EID (see Rollback Plan).

### 2) Bot-Wave / Coordinated Amplification
1. Trigger graph anomaly detector for churn and edge creation spikes.
2. Quarantine affected tenant index (read-only).
3. Recompute communities with pinned seed and verify stability.

### 3) Model Rollback
1. Select previous model weights hash from `stamp.json` archive.
2. Redeploy pinned weights.
3. Re-run evidence gate and verify hash equality.

### 4) Tenant Data Incident
1. Lock affected tenant access.
2. Confirm isolation boundaries and ACLs.
3. Produce a signed incident report and attach evidence bundle.

## On-Call Checklist (Minimal)
- Evidence gate green for last 2 runs.
- Determinism gate green for last run.
- No active community churn alerts.
- SBOM hash present in `stamp.json`.

## Rollback Plan
- Trigger: determinism gate failure or anomaly thresholds exceeded.
- Steps: revert to last green EID, redeploy pinned weights, re-run evidence gate.

## Operational Constraints
All external dependencies are **Intentionally constrained** to verified, pinned artifacts to preserve determinism in air-gapped environments.
