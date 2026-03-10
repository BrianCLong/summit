# Repo Reality Check

## Verified vs Assumed

| Aspect | Verified | Assumed |
|---|---|---|
| Package Manager | pnpm | |
| Bootstrap | `./scripts/golden-path.sh` | |
| Governance Policy | `docs/ci/REQUIRED_CHECKS_POLICY.yml` | |
| Reconciler | `./scripts/release/reconcile_branch_protection.sh` | |
| Top-level dirs | `ci`, `cli`, `client` (via `packages/`), `server` | |
| Governor Package Layout | | `packages/governor-*` |
| CLI Entrypoint | | `cli/governor/index.ts` |
| JSON Schema utility | | Standard zod or built-in validation |

## Must-not-touch
- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- `./scripts/release/reconcile_branch_protection.sh`
- existing branch-protection drift workflows
- release/versioning scripts
- current GA gate definitions

## IntelGraph Repo Assumptions (Verified)
- Public monorepo for Summit exists
- Node 18+, pnpm, Neo4j 5.x in quickstart
- GraphQL + REST APIs are core
- Collaboration/war-room and timeline issues exist
- CI/workflow surface is large and policy/evidence oriented

## IntelGraph Assumed
- `server/src/api` or equivalent GraphQL service exists
- `client/src` or equivalent React frontend exists
- Neo4j access is centralized behind a shared client
- Evidence artifacts follow repo-wide conventions
- Tenant scoping already exists outside IntelGraph

## Validation checklist before PR1 merges
- Confirm exact package/workspace boundaries
- Confirm existing GraphQL schema location
- Confirm auth context shape
- Confirm standard test command names
- Confirm runbook/docs locations
- Confirm must-not-touch branch protection workflows
