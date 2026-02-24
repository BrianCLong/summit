# LLM Vitals Standard

## Purpose
This standard defines deterministic, machine-verifiable model selection for Summit using Vitals scoring.

## Command Surface
- Top-level: `python -m summit vitals eval --force`
- Primary: `python scripts/vitals_eval.py --force`
- Summit module: `python -m summit.vitals.cli eval --force`

## Vitals Schema
Source of truth: `evaluation/vitals/schema.yaml`

Dimensions:
- accuracy
- latency_ms
- cost_per_1k_tokens
- safety_score
- robustness

Weights sum to `1.0`; schema validation fails otherwise.

## Artifacts
Outputs are deterministic and sorted:
- `report.json`
- `metrics.json`
- `stamp.json`

`stamp.json` stores only hashes and must not include wall-clock timestamps.

## Evidence IDs
Evidence IDs use:
`EVIDENCE-LLM-VITALS-<model>-<metric>-<hash>`

## CI Gate
Workflow: `.github/workflows/vitals-eval.yml`

Gate rules:
- Fail when any Vital regresses by more than `5%` versus baseline.
- Fail on budget violation (`runtime > 600s`, `cost > $5`).
- Fail if corpus hash validation is requested and mismatched.
- Deny by default on missing metrics.
