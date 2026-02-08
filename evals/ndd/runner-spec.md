# NDD Deterministic Runner Spec

1. Load fixtures in fixed order.
2. Apply canonical normalization and hashing.
3. Use pinned model hash and fixed seed.
4. Emit `report.json`, `metrics.json`, `stamp.json`.
5. Compare outputs to previous run; set `determinism_ok`.

## Inputs
- Fixtures stored under `evals/ndd/fixtures/` with deterministic IDs.
- Model artifacts referenced by pinned hash.

## Outputs
- `out/ndd/metrics.json` structured to match `eval-output.schema.json`.
- `out/ndd/stamp.json` includes determinism fields.
