# Evidence schemas

These schemas define the canonical structure for Summit evidence artifacts.

## Determinism constraints

- Timestamps belong only in `stamp.json`.
- `report.json` and `metrics.json` must be deterministic for the same inputs.
- Avoid embedding raw certificates, tokens, or secrets in any evidence file.

## Bundle-first evidence

Bundle-first verification should emit:

- `evidence/<EVIDENCE_ID>/report.json`
- `evidence/<EVIDENCE_ID>/metrics.json`
- `evidence/<EVIDENCE_ID>/stamp.json`

Ensure evidence IDs follow the `EVD-<ITEMSLUG>-<AREA>-<NNN>` pattern.
