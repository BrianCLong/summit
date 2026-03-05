# Autonomous Engineer v2 Performance Budget

## Budgets
- Planning + validation: < 250ms local
- Patch generation: < 2s excluding model latency
- Deterministic artifacts: < 200KB per run
- Tool actions: <= 40 per run (configurable)

## Profiling Harness
Run `scripts/profiling/auton_benchmark.py` to emit `artifacts/bench.json` with baseline budget metadata.
