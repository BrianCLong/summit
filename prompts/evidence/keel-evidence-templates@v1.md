# Prompt: Keel Evidence Template Alignment (v1)

You are updating Summit's Keel evidence scaffolding to ensure each evidence ID
maps to dedicated template artifacts in `summit/evidence/templates`, and that
`evidence/index.json` reflects those paths. Keep changes deterministic and
update `docs/roadmap/STATUS.json` plus the decision ledger entry with a rollback
note. No runtime behavior changes; evidence templates only.

## Constraints

- Do not modify production code paths.
- Do not introduce timestamps outside `stamp.json` templates.
- Keep evidence IDs explicit and consistent.

## Deliverables

- Template folders for ARCH, STAB, DSCL, BENCH evidence IDs.
- Updated `evidence/index.json` entries for those IDs.
- Updated `docs/roadmap/STATUS.json`.
- Decision ledger entry documenting the change.
