# Runbook: LLM Vitals Evaluation

## Rerun Evaluation
```bash
VITALS_EVAL_ENABLED=true python -m summit vitals eval --force --out-dir artifacts/llm-vitals
```

```bash
VITALS_EVAL_ENABLED=true python scripts/vitals_eval.py --force --out-dir artifacts/llm-vitals
```

## Update Baseline
1. Run evaluation and inspect ranking/regression outputs.
2. If approved, replace `evaluation/vitals/baseline_metrics.json` with the new `metrics.json`.
3. Commit baseline update with rationale in PR description.

## Cost Spike Response
1. Open `artifacts/llm-vitals/metrics.json`.
2. Check `budgets.estimated_cost_usd` and per-model `estimated.cost_usd`.
3. If over threshold, pause baseline updates and investigate token-cost assumptions.

## Provider Outage Fallback
- Continue running fixture mode from `evaluation/vitals/provider_fixtures.json`.
- Do not disable the gate; keep deterministic checks active.

## Weekly Drift Check
```bash
python scripts/monitoring/llm-vitals-drift.py \
  --baseline evaluation/vitals/baseline_metrics.json \
  --current artifacts/llm-vitals/metrics.json \
  --out artifacts/llm-vitals/drift_report.json
```
