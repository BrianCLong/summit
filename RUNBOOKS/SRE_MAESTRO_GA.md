# SRE Runbook — Maestro Conductor GA

## Golden Signals
- Latency p95 target: <= 1.5s
- Error rate: < baseline + 2%
- Saturation: < 70%

## Canary/Rollback
- Canary 5% → 25% → 50% → 100%
- Auto-rollback on thresholds breach
- Toggle: feature.maestro_v2

## Incident Classes & First Actions
- Latency spike: capture flamegraph, scale up, revert last flag
- Error spike: roll back canary, examine last deploy diff
- Authz drift: block via OPA deny ruleset, revert
