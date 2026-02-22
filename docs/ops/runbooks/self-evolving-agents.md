# Runbook: Self-Evolving Agents

## Feature Flag
Enable/Disable via environment variable: `SUMMIT_SELF_EVOLVE=1`

## Drift Detection
Scheduled CI jobs run benchmarks and compare results against stored baselines.
If a regression exceeds 5%, the job fails and alerts Ops.

## Rollback Steps
1. Set `SUMMIT_SELF_EVOLVE=0`.
2. Revert the active `EvolutionPolicy` bundle to a known-good state.
3. Purge recent mutation artifacts if necessary.
