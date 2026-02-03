# Eval Baselines & Ratcheting

This harness establishes baseline gates that **pass today**, then lets us ratchet
thresholds upward (or tighten error budgets) per release. Baselines live in
`eval/baselines.yaml` and are enforced by `eval/runner.py`.

## Baseline philosophy

1. **Set today’s floor**: Choose thresholds that pass the current CI run.
2. **Ratchet with releases**: Tighten one knob per release (score floor, latency,
   or error budget), then re-run to keep evidence bundles consistent.
3. **Avoid brittle gates**: Prefer small incremental increases over jumps.

## Update workflow

1. Run the suite to capture a fresh report.
2. Update `eval/baselines.yaml` for the suite/task you are ratcheting.
3. Re-run and commit evidence bundles for the new baseline.

## Suite naming

Suites use the `id` field in each YAML file (e.g. `core_evals`, `router`). The
runner maps suite IDs to baseline config sections.
