# Maestro Spec Runbook

## Trigger

Run when intake requires structured requirements extraction and deterministic handoff seeds.

## Command

```bash
python3 scripts/emit_spec_bundle.py --input <input.json> --slug <slug>
```

## Inputs

- JSON payload compatible with `schemas/maestro_spec.schema.json`
- Completed section summaries for each required section

## Outputs

- `artifacts/maestro/<slug>/spec_bundle.json`
- `artifacts/maestro/<slug>/report.json`
- `artifacts/maestro/<slug>/metrics.json`
- `artifacts/maestro/<slug>/stamp.json`

## Failure Escalation

1. Missing section or summary: return to interview phase and collect data.
2. Contradictions detected: resolve requirements before planning.
3. Score below 20/25: revise requirements and rerun emitter.
4. Blocking questions present: do not proceed to implementation planning.

## Retry Policy

- Fix inputs, then rerun with the same slug for deterministic overwrite.
- Compare `spec_bundle.json` hash before and after edits to confirm intended change.
