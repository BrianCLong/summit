# Prompt: Qwen3.5 Medium Model Integration (v1)

## Objective
Integrate Alibaba Qwen3.5 Medium model claims and evaluation stack into Summit with deterministic evidence and policy gating.

## Scope
- `summit/models/adapter.py`
- `summit/models/qwen/`
- `summit/tests/models/`
- `summit/benchmarks/profiles/`
- `summit/evals/cost_efficiency.py`
- `summit/scripts/license_check_qwen.py`
- `summit/scripts/monitoring/qwen3_5_drift.py`
- `summit/docs/monitoring/qwen3_5_medium.md`
- `.github/workflows/license.yml`
- `requirements.in`
- `docs/compliance/CONTROL_REGISTRY.md`
- `.github/workflows/jetrl-ci.yml`

## Constraints
- Evidence-first output: produce reproducible benchmark profiles and drift detectors.
- Policy-gated: models MUST pass license verification before being enabled.
- Deterministic: avoid wall-clock timestamps in evidence artifacts (heuristic check).
- S-AOS compliant PR descriptions.

## Required Outputs
- Standardized `BaseModelAdapter` and `ModelOutput`.
- Qwen3.5-Medium adapter with sync/async httpx implementation.
- Unit tests with 100% coverage for the new adapter.
- Validated benchmark profile vs Sonnet 4.5.
- Cost-performance scoring utility.
- CI license verification gate and drift monitoring script.
