# Coordination Evaluation Repository Assumptions

## Assumed Structure

- `summit/evals/` hosts evaluation modules and deterministic artifact emitters.
- `summit/ci/` hosts hard gates that block CI on quality regressions.
- `summit/agents/` hosts shared agent utilities, including context propagation primitives.
- `docs/` hosts standards, security handling, and ops runbooks.

## Must-Not-Touch Guardrails

- Core evaluation harness internals remain unchanged; this slice adds extension modules only.
- Existing CI checks remain active; coordination check is additive.
- Existing evidence schemas remain untouched; coordination artifacts use separate filenames.

## Validation Checklist

- [x] Confirmed existing evidence artifacts use deterministic JSON serialization.
- [x] Confirmed existing CI checks have explicit named scripts in `summit/ci/`.
- [x] Confirmed Python test harness accepts pytest-style tests under `summit/evals/**/tests`.
- [x] Confirmed artifacts can be emitted to `artifacts/` without mutating base schemas.
