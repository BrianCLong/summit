# TTT-Discover Runbook

## Purpose

Operate the discovery runner for continuous-reward tasks with deterministic evidence artifacts.

## Local (CPU Toy)

1. Configure a toy evaluator and proposal generator.
2. Run the discovery runner with a small budget.
3. Validate `runs/<run_id>/report.json`, `metrics.json`, and `stamp.json`.

## CI (Tiny Budget)

- Use minimal `max_steps` and `max_cost_units`.
- Validate determinism by re-running with the same seed.

## Controlled GPU Job (Optional)

- Enable network explicitly if required by the evaluator.
- Capture cost metrics and enforce upper bounds.

## Failure Modes

- **Non-improving reward**: evaluator instability or search configuration needs tuning.
- **Budget aborts**: cost caps exceeded; report must still be complete.
- **Determinism drift**: mismatched configs or dependency drift.

## SLO/SLA Assumption

A run must either finish within budget or abort with a complete report.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Tools, Infra, Observability, Security
- **Threats Considered**: runaway execution, opaque failures, missing evidence
- **Mitigations**: budget enforcement, deterministic reporting, evidence validation
