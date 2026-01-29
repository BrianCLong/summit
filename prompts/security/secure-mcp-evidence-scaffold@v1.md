# Secure MCP Evidence Scaffold (v1)

## Objective

Create the minimal Secure MCP evidence schema scaffold and CI verification entrypoint, with deterministic required-check discovery guidance.

## Scope

- `evidence/schemas/`
- `evidence/index.json`
- `ci/verify_evidence.sh`
- `required_checks.todo.md`
- `docs/roadmap/STATUS.json`
- `agents/examples/`

## Constraints

- Preserve deny-by-default posture for evidence gates.
- Do not introduce runtime behavior changes; schema and validation only.
- Use deterministic outputs (no timestamps outside stamps).

## Deliverables

- Updated evidence schemas and index with Secure MCP alignment.
- Shell-based verifier that validates evidence JSON against schemas.
- Required checks discovery instructions.
- Task spec recorded under `agents/examples/`.
