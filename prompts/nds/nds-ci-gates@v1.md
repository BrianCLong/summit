# NDS CI Gates Scaffolding (v1)

## Objective

Establish the NDS CI gate workflow and evidence metadata updates for the Narrative Dominance Suite.

## Required Changes

- Add `.github/workflows/nds-ci.yml` running evidence and dependency delta gates.
- Update `evidence/index.json` with `EVD-NDS-CI-001..004` entries.
- Update `required_checks.todo.md` to list the NDS gate.
- Update `docs/roadmap/STATUS.json` to record the CI gate milestone.

## Constraints

- Keep the change set minimal and deterministic.
- Do not introduce new dependencies.
- Preserve existing evidence index structure.

## Evidence

- Reference `EVD-NDS-CI-001..004` in the evidence index.
