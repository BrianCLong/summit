# NDD Testing Strategy

## Unit Tests
- Canonical normalization and hashing.
- Metric computations with deterministic fixtures.

## Integration Tests
- End-to-end run emits `report.json`, `metrics.json`, `stamp.json`.
- Determinism: two consecutive runs produce identical outputs.

## Regression Tests
- Challenge events: no/late/multiple challenges.
- Handoff detection: tier shifts and register changes.

## Evals
- Fixture suite in `evals/ndd/` with pass/fail thresholds.
- HLT benchmark compared to virality baseline.
