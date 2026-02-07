# NarrativeOps Evals & Benchmarks

## Summit Readiness Assertion
Evals align with the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) and GA evidence gates.

## Required Evals
1. **Determinism**: identical inputs → identical hashes.
2. **Narrative Drift**: detects frame/strategy shifts across windows.
3. **Strategy Detection**: taxonomy-aligned precision/recall with macro-F1.
4. **Impact Calibration**: calibration error and drift signals.

## CDNP Benchmark (Cross-Domain Narrative Portability)
- Train/tune on political IO fixtures.
- Test on economic/market narratives.
- Report false-positive inflation and frame completeness under shift.

## Directory Structure (Expected)
```
packages/narops-evals/
  determinism/
  drift/
  strategy/
  impact/
  cdnp/
  fixtures/
```

## Pass/Fail Thresholds (Initial)
- Determinism: hash equality required.
- Strategy Macro-F1: threshold defined per fixture release.
- Impact Calibration: ECE within gated threshold.
- CDNP: portability score within release budget.

## Regression Policy
Any failure blocks merge until the gate is green or a governed exception is recorded.
