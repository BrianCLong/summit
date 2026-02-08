# Contamination Benchmark (LSCB)

## Purpose
Measure drift and leakage risk for long-running scoped GraphRAG sessions.

## Metrics
- `lscb.leakage_edges`: count of derived edges visible across scopes.
- `lscb.drift_auc`: area under drift score curve.
- `lscb.expired_claim_reuse`: derived claims reused after expiration.
- `lscb.parallel_interference`: cross-scope interference rate.

## Thresholds
- `lscb.leakage_edges`: 0
- `lscb.drift_auc`: <= 0.15
- `lscb.expired_claim_reuse`: 0
- `lscb.parallel_interference`: 0

## Evidence Bundle
- `report.json`: scenario details and failure diagnostics.
- `metrics.json`: metrics above with deterministic keys.
- `stamp.json`: build metadata, policy ID, dataset snapshot ID.

## Determinism Requirements
- Fixed dataset snapshot ID.
- Fixed policy version and allowlist.
- Fixed model version and decoding settings.
