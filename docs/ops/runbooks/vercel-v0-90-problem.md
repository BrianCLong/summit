# Runbook — RepoFlow (Vercel v0 “90% Problem” Subsumption)

## Summit Readiness Assertion
This runbook is governed by the Summit Readiness Assertion and inherits its enforcement posture. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative mandate.

## Enablement
- Set `SUMMIT_REPOFLOW_ENABLED=1` in the controlled environment.
- Confirm policy bundle and evidence outputs are in place before enablement.

## Sandbox Failures
- **Timeout**: Verify profile timeout and rerun with lower scope. Deferred pending configuration update.
- **OOM**: Reduce fixture scope and enforce evidence size limits.

## Policy Failures
- Inspect `artifacts/evidence/<EVID>/report.json` for decision reasons.
- Validate policy hash against `.github/policies/repoFlow-policy.json`.

## Evidence Artifact Triage
- Confirm `report.json`, `metrics.json`, and `stamp.json` exist.
- Re-run policy gate if fields are missing.

## Security Incident Response
- Suspected secret exposure: revoke credentials immediately and purge evidence artifacts.
- File an incident in the provenance ledger and link evidence IDs.

## Observability Signals
- `REPOFLOW_RUN_FAILED`
- `REPOFLOW_POLICY_DENY`
- `REPOFLOW_SECRET_REDACTION_HIT`
