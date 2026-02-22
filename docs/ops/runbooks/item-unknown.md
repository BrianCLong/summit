# Runbook — Subsumption Bundle Verifier (item-unknown)

## Failure modes
- Missing manifest
- Missing evidence files
- Index not updated
- Missing deny-by-default fixtures
- Lockfile changed without deps_delta update

## Alerts (CI)
- On failure: surface actionable error with file paths
