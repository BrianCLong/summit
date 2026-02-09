# Runbook: SAGE Self-Hint GRPO

## Enabling SAGE
1. Update trainer config to set `sage.enabled = True`.
2. Ensure `hint_levels` are set (e.g., `[1]`).

## Monitoring
* **Drift**: Run `python scripts/monitoring/sage_drift.py <metrics.json>`.
* **Metric**: `mixed_outcome_rate` should be > 0.0 for sparse reward tasks.
* **Alert**: If `mixed_outcome_rate` drops near 0.0, advantage collapse is occurring.

## Rollback
Set `sage.enabled = False` to revert to standard GRPO behavior.
