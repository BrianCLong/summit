# DAAO Runbook

## Feature Flag

Enable DAAO via `SUMMIT_DAAO_LITE=1`.

## Monitoring

*   Check `scripts/monitoring/out/daao-drift.json` for drift in model selection and cost.
*   Alert if "Budget exceeded" failures spike.

## Troubleshooting

### High latency

If enabled, DAAO adds 2 additional LLM calls for medium/hard tasks.
Disable flag to revert to single-shot execution.

### Router always picking fallback

Check if cost config in `modelCatalog.ts` matches real API pricing.
Check if user budget is too low (default is Infinity, but if set low, it will fail).
