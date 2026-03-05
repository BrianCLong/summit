# Runbook — Forbes Serious Clients Prompts (2026-02-06)

## Purpose
Operate the serious client tone prompt pack with deterministic artifacts and governance-safe
outputs.

## Run Locally
```bash
python -m summit.cli.run_promptpack promptpack serious-client-tone \
  --input fixtures/serious_client_tone/*.json \
  --out-dir artifacts/serious_client_tone
```

## Interpret Metrics
- `availability_signal_count`: number of availability cues detected.
- `transformation_first_present`: boolean marker for transformation language.
- `serious_client_score`: 0–100 integer (higher is better).

## Threshold Tuning
Adjust gating thresholds in CI by comparing `serious_client_score` against the agreed baseline.

## Rollback
1. Set `SERIOUS_CLIENT_TONE_PACK=0` in the environment.
2. Remove the CI step that runs the pack runner.
3. Delete generated artifacts if needed.

## Notes
The runner is intentionally constrained to a Python module invocation until the unified
Summit CLI wrapper is wired.
