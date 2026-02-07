# Runbook: Software Factory Subsumption (StrongDM 2026)

Status: Active draft for governed adoption.

## Scope

This runbook defines how to add and operate holdout suites, local digital twins, and satisfaction
gates in the factory-grade, non-interactive pipeline mode.

## Add a New Twin

1. Create a new twin module with deterministic fixtures.
2. Ensure outbound network calls are blocked in tests.
3. Provide a local start command (e.g., `summit twin up <name>`).
4. Register the twin in the local twin registry.
5. Add determinism tests that assert stable responses.

## Add a Holdout Suite

1. Create a suite under `suites/holdout/<name>` (format per scenario schema).
2. Record the suite content hash in `stamp.json`.
3. Store holdout suites outside agent-visible workspace where feasible.
4. Add a CI gate to assert the suite hash is unchanged.

## Interpreting Satisfaction Regressions

- If the satisfaction score drops below threshold:
  - Validate twin determinism and fixture integrity.
  - Inspect rubric outputs for injection signals.
  - Compare the previous `report.json` to isolate regressions.

## Emergency Disable Flags

- Disable factory validation: `SUMMIT_FACTORY_MODE=0`.
- Disable satisfaction gating: `SUMMIT_SATISFACTION_GATE=0`.
- Disable twin usage: `SUMMIT_TWIN_MODE=0`.

## Observability Signals

- Satisfaction score per suite.
- Suite hash integrity status.
- Twin determinism hash mismatch alerts.
