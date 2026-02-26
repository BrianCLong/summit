# Evidence System (CogOps Foundation)

The evidence system provides deterministic, auditable artifacts for cognitive operations analysis.

## Bundle layout

Each run emits:

- `evidence/index.json`
- `evidence/<EVD-ID>/report.json`
- `evidence/<EVD-ID>/metrics.json`
- `evidence/<EVD-ID>/stamp.json`

`stamp.json` is the only file allowed to carry timestamps.

## Determinism contract

- Evidence IDs are sorted lexicographically.
- JSON output is stable-stringified with sorted keys.
- Regeneration with identical input must produce byte-identical outputs except `stamp.json`.

## Classification

Every report includes one of:

- `PUBLIC`
- `INTERNAL`
- `RESTRICTED`

## Deny-by-default posture

Validation and policy checks reject:

- malformed evidence IDs
- missing required fields
- extra undeclared properties
