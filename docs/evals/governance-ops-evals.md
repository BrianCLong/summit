# Governance Operations Plane — Evaluation Suite

## Sensing (UEF)

- Inputs:
  - Required evals: MTTContain, rollback success rate, supply-chain coverage, assurance SLA, GRI.
  - Determinism requirement and evidence artifacts.
- Constraints:
  - Seeded harness, reproducible fixtures, CI blocking thresholds.

## Reasoning

The evaluation suite defines deterministic metrics and thresholds that block regressions and certify governance operations readiness.

## Authority & Alignment

- **Readiness anchor:** `docs/SUMMIT_READINESS_ASSERTION.md`.
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

## Metrics & Thresholds

- **MTTContain:** P95 <= 60s (simulated drill).
- **Rollback Success Rate:** >= 99% on fixtures.
- **Supply-Chain Coverage:** >= 95% attribution in staging.
- **Assurance SLA:** >= 98% systems current.
- **GRI (Governance Reversibility Index):** >= 0.92 weighted score.

## Deterministic Harness

- Seeded simulation (`seed` in `evidence/stamp.json`).
- Canonical JSON serialization for metrics.
- Fixed input fixture sets for incidents, rollbacks, and model usage.

## Fixtures

- **incident-drill.json**: synthetic misbehavior with expected quarantine path.
- **rollback-plan.json**: target state and expected evidence chain.
- **supply-chain-usage.json**: mixed first/third-party model usage.
- **assurance-tier-map.json**: tiered systems and schedule expectations.

## Metrics Schema (metrics.json)

```json
{
  "suite": "governance-ops",
  "timestamp": "ISO8601",
  "metrics": {
    "mtt_contain_seconds_p95": 0,
    "rollback_success_rate": 0,
    "supply_chain_coverage": 0,
    "assurance_sla": 0,
    "gri_score": 0,
    "gri_components": {
      "quarantine_latency": 0,
      "rollback_completeness": 0,
      "evidence_integrity": 0
    }
  }
}
```

## CI Gates

- Block merge if any metric below threshold.
- Block merge if deterministic replay diverges.
- Block merge if evidence hash chain invalid.

## Regression Tests

- Quarantine enforcement: blocked actions for quarantined agents.
- Replay determinism: identical outputs for identical fixtures.

## Finality

Evaluation thresholds are mandatory and enforceable without deferral.
