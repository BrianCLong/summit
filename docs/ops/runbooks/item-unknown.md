# Runbook: item-unknown Subsumption Bundle

## Failure Modes
1) Verifier fails: missing docs/evidence/index
2) deps-delta missing after lockfile change
3) deny-by-default fixtures missing

## Triage
- Run: node scripts/ci/verify_subsumption_bundle.mjs --item item-unknown --local

## Alerts (future)
- Drift detector failure
- Verifier runtime regression
