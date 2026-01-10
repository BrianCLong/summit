# Determinism Tokens

Determinism tokens bind executions to reproducible states for evaluator replay.

## Fields

- **seed**: PRNG seed for deterministic behavior.
- **dataset_snapshot_id**: hash or pointer to immutable dataset snapshot.
- **module_versions**: ordered list of module identifiers and versions used in execution.
- **policy_profile**: redaction/egress policy identifier applied during run.
- **time_window_id**: optional window identifier aligning runs to assessment cycles.

## Usage

- Required for every evaluator call; must be recorded inside metric proof objects and witness chains.
- Counterfactual runs use modified policy_profile or module versions but preserve linkage to snapshot.
- Tokens are immutable once issued; any change produces a new hash.
- Time windows should align with `compliance/darpa/assessment_cadence_plan.md`.
