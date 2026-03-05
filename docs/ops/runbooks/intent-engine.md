# Runbook: Intent Engine (Validation Layer)

## Purpose

Operate and triage the Summit intent validation layer with deterministic outputs and policy-enforced CI behavior.

## Preconditions

- Feature flag `INTENT_ENGINE_V1` is intentionally set for the target environment.
- Schema, determinism, and policy checks are enabled in CI.

## Standard Flow

1. Validate `intent_spec.yaml` against schema.
2. Execute validator in deterministic mode.
3. Generate artifacts:
   - `artifacts/intent/report.json`
   - `artifacts/intent/metrics.json`
   - `artifacts/intent/stamp.json`
4. Enforce CI pass/fail on policy verdict.

## Failure Triage

### A) Schema Validation Failure

- Confirm required fields (`intent_id`, `objective`, `constraints`, `stop_rules`).
- Confirm no unsupported constraint/operator types.
- Re-run schema check and capture error output in CI logs.

### B) Determinism Failure

- Re-run validator twice on identical input.
- Compare `report.json` and `metrics.json` byte-for-byte.
- Ensure all time-variant fields are isolated to `stamp.json`.

### C) Constraint Violation

- Inspect policy verdict section in `report.json`.
- Confirm violation maps to an explicit constraint in spec.
- Reject merge until spec or implementation is corrected.

## Regenerating Artifacts

1. Remove prior `artifacts/intent/*.json` outputs.
2. Re-run validation pipeline with same inputs.
3. Confirm deterministic artifacts are unchanged across two consecutive runs.

## CI Override Protocol

No policy bypass by default.

If a temporary exception is required:

1. Create a governed exception record under existing governance process.
2. Reference exception ID in PR and evidence trail.
3. Set expiration and rollback trigger before merge.

## Rollback Plan

Trigger rollback when:

- Determinism incident rate breaches agreed threshold.
- CI gate false-positive rate materially degrades delivery.

Rollback steps:

1. Disable `INTENT_ENGINE_V1`.
2. Revert offending change set.
3. Re-run baseline CI suite.
4. File remediation issue with root-cause and next safe re-enable point.
