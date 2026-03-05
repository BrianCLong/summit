# Intent Engine Runbook

## Overview
This runbook covers operational procedures for the Summit Intent Engine, an agent-optimized content pipeline and constraint enforcement system.

## SLOs
- **Availability:** 99% CI pass stability for intent spec evaluations.
- **Determinism:** <1% non-determinism incidents on identical `intent_spec` configurations.

## Feature Flag Rollout Plan
**Flag Name:** `INTENT_ENGINE_V1`
**Default State:** `OFF`

To test locally:
```bash
export INTENT_ENGINE_V1=true
```

## Triage
### `intent-determinism-check` Failures
**Symptom:** Constraint violations indicating non-determinism when processing identical specs.
**Resolution:**
1. Check `artifacts/intent/report.json` for discrepancies between runs.
2. Ensure no non-deterministic code (e.g. timestamps, random numbers, unsorted lists) has been introduced to the pipeline evaluator.

### `perf-budget` Failures
**Symptom:** Pipeline memory, token reduction ratio, or runtime exceeds defined limits.
**Resolution:**
1. Check `artifacts/intent/metrics.json` to identify which metric failed.
2. Review the raw agent queries in the spec for unusually large token counts.

## How to Regenerate Artifacts
Run the evaluation test suite locally to recreate the outputs:
```bash
PYTHONPATH=. python3 tests/intent/test_determinism.py
```
Outputs are written to `artifacts/intent/`.

## CI Override Protocol
In an emergency (e.g. false positives in pipeline blocking merges), a security or engineering manager may temporarily disable the CI check by modifying `.github/required-checks.yml` or adding an exception flag. This action MUST be documented.
