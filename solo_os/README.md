# Solo OS (ENTRE-502318)

Modular "operating system" for solo entrepreneurs, focusing on market signals, revenue automation, workflow orchestration, and content control.

## Components

- **Signal Engine**: Market demand discovery and normalization.
- **Revenue Engine**: Lead follow-up and revenue state machine.
- **Orchestration Engine**: Workflow DAG runner.
- **Content Engine**: Content brief and experiment management.

## Governance

- **Deny-by-default**: All outbound actions and connector interactions are blocked unless explicitly allowed in `solo_os/governance/policy.default.json`.
- **Never-Log**: PII and secrets must never be logged.

## Evidence

Every engine run produces deterministic evidence artifacts in `solo_os/evidence/runs/<engine>/<run_id>/`:
- `report.json`: Human-readable summary.
- `metrics.json`: Quantitative run data.
- `stamp.json`: Timestamps, git commit, and run ID.

## Feature Flags

- `solo_os.enabled`: Enable the Solo OS module.
- `signal_engine.enabled`: Enable the Signal Engine.
- `orchestration.dry_run`: Force dry-run mode for orchestration.
