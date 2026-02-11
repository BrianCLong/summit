# Runbook: Self-Evolving Agents

## Feature Flag
Enable with `SUMMIT_SELF_EVOLVE=1`.

## Drift Detection
Check `artifacts/self-evolving-agents/drift_report.json`.
Failures in the scheduled CI job indicate significant regression.

## Rollback
1. Set `SUMMIT_SELF_EVOLVE=0`.
2. Revert recent policy bundle changes in `summit/self_evolve/policy.py`.
