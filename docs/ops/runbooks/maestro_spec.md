# Maestro Spec Interview Runbook

## Execution Flow

1. Prepare structured interview input JSON.
2. Run `scripts/maestro/emit_spec_bundle.py` with target mode.
3. Validate emitted artifacts against Maestro schemas.
4. Route `jules_tasks` and `codex_tasks` into planning lanes.

## Failure Escalation

- Schema validation failure: block merge, open governance issue.
- Missing requirement IDs: block merge, rerun ID assignment.
- Blocking open questions in non-MVS mode: escalate to requirements owner.

## Retry Policy

- Retry once for malformed input after correction.
- Do not retry unchanged input for determinism failures; treat as defect.

## Monitoring

- Weekly drift check over schema compatibility and required fields.
- Alert when requirement count or open question count regresses unexpectedly.

## SLO

- Target: 99% successful spec bundle generation for valid inputs.
