# Dynamic Intent Evidence Framework

This evidence bundle governs SketchDynamics-aligned workflows in Summit. Evidence artifacts must
remain deterministic; timestamps are allowed only in `evidence/stamp.json`.

## Evidence IDs

- `EVD-SKETCHDYNAMICS-PIPELINE-001`: end-to-end dynamic intent scaffold run.
- `EVD-SKETCHDYNAMICS-CLARIFY-001`: ambiguity-triggered clarification loop.
- `EVD-SKETCHDYNAMICS-REFINE-001`: localized refinement verification.

## Determinism Rules

- No timestamps outside `evidence/stamp.json`.
- Evidence filenames are stable and content-hash friendly.
- Evidence must reference fixtures and schemas explicitly in `evidence/index.json`.

## Governance Alignment

This framework aligns with the Summit Readiness Assertion and the evidence separation contract
(metrics/report/stamp separation). Evidence is authoritative; commentary is secondary.
