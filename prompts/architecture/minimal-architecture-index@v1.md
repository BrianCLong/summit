# Prompt: Minimal Architecture Index + Graph Schema (v1)

## Objective

Create the minimal architecture repository artifacts that make Summit's system-of-systems legible
and queryable: a machine-readable system index, a human-readable system index, a validating schema
for the system index, and a canonical Summit graph schema. Update roadmap status metadata to
record the change.

## Scope

- Create `docs/architecture/system-index.json`, `docs/architecture/system-index.schema.json`, and
  `docs/architecture/system-index.md`.
- Create `docs/architecture/summit-graph.schema.json`.
- Create `docs/architecture/README.md` to describe the architecture repository.
- Update `docs/roadmap/STATUS.json` with revision metadata.

## Constraints

- All artifacts must reference governing authority files (readiness assertion, constitution,
  meta-governance, agent mandates, and agent contract).
- Keep the system index intentionally constrained to the minimal viable inventory.
- No changes outside of the declared scope.

## Success Criteria

- Architecture index and schema files exist and are consistent.
- Roadmap status reflects the update.
- Artifacts are versioned, readable, and traceable to authority sources.
