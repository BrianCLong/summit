# Repo Assumptions and Verification Ledger

This ledger records verified repository facts and declared assumptions. Any item marked
"Deferred pending verification" is not treated as authoritative until inspected.

## Verified

| Area | Evidence | Notes |
| --- | --- | --- |
| Package manager | `package.json` specifies `pnpm@10.0.0` | pnpm is authoritative for installs. |
| Core scripts | `package.json` includes `test`, `test:e2e`, `lint`, `typecheck` | Standard commands exist for CI and local validation. |
| Compose files | Multiple `docker-compose*.yml` files exist in repo root | Compose is available for dev and infra stacks. |
| Primary zones | `client/`, `server/`, `packages/`, `apps/` directories exist | Monorepo structure is present. |
| Readiness authority | `docs/SUMMIT_READINESS_ASSERTION.md` exists | Governs readiness baseline and exceptions. |

## Assumed (Deferred pending verification)

| Area | Assumption | Source |
| --- | --- | --- |
| API paths | `src/api/{graphql,rest}` exists | Provided path map. |
| Agent runtime | `src/agents` exists with agent execution surfaces | Provided path map. |
| Connectors | `src/connectors` exists with ingestion stubs | Provided path map. |
| GraphRAG | `src/graphrag` exists with graph abstractions | Provided path map. |
| Tests | `tests/` contains unit test suites | Provided path map. |
| Docs | `docs/{architecture,api,security}` contain primary docs | Provided path map. |
| CI workflows | `.github/workflows/*` contains PR/CI workflows | Provided path map. |

## Must-Not-Touch (Deferred pending verification)

- Auth, prod deploy, and secrets surfaces are treated as protected until governance review is
  completed and explicitly recorded.
- Any exception is recorded as a governed exception with rollback guidance.

## Validation Checklist

- Confirm `pnpm` scripts and test commands remain accurate.
- Confirm Neo4j wiring and existing GraphRAG abstractions.
- Confirm agent run logging and events to avoid duplication.
- Confirm CI workflow names and required checks.
- Identify protected files and annotate the must-not-touch list.
