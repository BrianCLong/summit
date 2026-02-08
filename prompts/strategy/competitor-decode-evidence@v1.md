# Prompt: Competitor Decode Evidence Scaffolding (v1)

## Mission

Implement evidence-first scaffolding for the competitor decode pipeline, including deterministic
evidence writers, schema baselines, and required-check discovery stubs. Keep scope limited to the
evidence subsystem and governance tracking updates.

## Requirements

- Add evidence schemas for report, metrics, stamp, and index under
  `src/graphrag/evidence/schemas/`.
- Implement a deterministic evidence writer that:
  - canonicalizes JSON with sorted keys,
  - stabilizes array ordering,
  - rejects timestamps outside `stamp.json`.
- Add unit tests validating determinism and timestamp enforcement.
- Add required-check discovery guidance under `.github/scripts/required-checks/README.md`.
- Update `required_checks.todo.md` with temporary SummitGate placeholders.
- Update `docs/roadmap/STATUS.json` with a new revision note and timestamp.
- Add a task spec under `agents/examples/` following `agents/task-spec.schema.json`.

## Constraints

- No schema changes outside the evidence directory.
- Do not introduce non-deterministic ordering or timestamps outside the stamp.
- Keep changes within the declared scope paths.

## Deliverables

- Evidence schema JSON files.
- `writeEvidence.ts` with deterministic serialization and validation.
- Jest tests under `tests/graphrag/evidence/`.
- Governance documentation updates and task spec.
