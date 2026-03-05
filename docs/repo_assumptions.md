# Repository Assumptions for Design MCP Subsumption

Status: **Assumed pending local verification**.

## Assumed Paths

- `src/agents/`
- `src/connectors/`
- `src/graphrag/`
- `.github/workflows/`
- `.github/scripts/`
- `docs/architecture/`
- `docs/security/`

## Must-Not-Touch Boundaries

- Existing GraphRAG pipeline
- Production CI workflows
- Core connectors

## Validation Checklist Before PR1

- Confirm workspace/package topology under `pnpm`.
- Confirm package-local test runner conventions (`vitest` vs `jest`).
- Confirm required CI check names and branch protections.
- Confirm canonical evidence ID schema and validator locations.
