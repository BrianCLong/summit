# Evidence Structure Verification Gate (PR1)

## Objective

Add a minimal evidence structure verification script, wire it into CI, and update required-check discovery notes while keeping scope limited to governance and CI scaffolding.

## Scope

- .github/scripts/evidence-verify.mjs
- .github/workflows/ci-verify.yml
- required_checks.todo.md
- docs/roadmap/STATUS.json
- prompts/ci/evidence-structure-verify@v1.md
- prompts/registry.yaml

## Constraints

- Structure-only verification (no new dependencies).
- No behavior changes outside CI scaffolding.
- Keep changes additive and minimal.
