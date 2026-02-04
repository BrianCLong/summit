# DAAO Runbook

## Feature Flags
- `SUMMIT_DAAO_LITE=1`: Enables the DAAO path (estimator -> router -> debate).

## Common Issues
### "No model met criteria/budget"
- **Symptom**: Router falls back to `gpt-4o-mini` (or configured fallback) with reason code `fallback`.
- **Fix**: Increase budget or check if provider API keys are valid/quota exceeded.

### "Critique JSON Parse Failed"
- **Symptom**: Validator logs "Failed to parse critique".
- **Impact**: System proceeds to Refiner with raw critique text. Usually benign.
- **Fix**: Tune `CRITIC_PROMPT` to be more strict about JSON output.

## Monitoring
- Check `scripts/monitoring/out/daao-drift.json` for shifts in model selection distribution.
- Alert if `fallback` rate > 10%.
