# Prompt: Compound Loop Evidence Skeleton (Lane 1)

## Intent

Establish the Summit compound loop evidence skeleton with deterministic schemas, emit/validate helpers,
fixtures, and governance documentation.

## Scope

- Create compound evidence schemas under `src/agents/compound/evidence/schemas/`.
- Add emit/validate utilities for deterministic evidence bundles.
- Add fixtures and Jest tests under `tests/agents/compound/`.
- Add governance documentation and update roadmap status.

## Constraints

- Do not introduce timestamps outside `stamp.json`.
- Use `additionalProperties: false` in schemas.
- Keep blast radius limited to the compound evidence module.
