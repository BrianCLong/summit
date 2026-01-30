# Subsumption Bundle Framework Scaffold (v1)

## Objective

Establish the subsumption bundle framework scaffolding, verifier gate, and governance docs needed to ingest external ITEMS with deterministic evidence.

## Scope

- `subsumption/**` bundle templates and fixtures.
- `scripts/ci/**` verifier logic or fixtures.
- `docs/standards/**`, `docs/security/data-handling/**`, `docs/ops/runbooks/**`, `docs/decisions/**`.
- `docs/repo_assumptions.md`, `docs/required_checks.todo.md`, `docs/roadmap/STATUS.json`.
- `evidence/index.json`, `deps_delta/**`, `backlog/**`.
- `.github/workflows/subsumption-bundle.yml`.

## Constraints

- Additive, merge-safe changes only.
- Deterministic evidence outputs required.
- Deny-by-default fixtures required when gates declare them.

## Success Criteria

- Verifier runs on the template manifest without failure.
- Required docs and evidence schema targets exist.
- Evidence index includes the required subsumption framework IDs.
