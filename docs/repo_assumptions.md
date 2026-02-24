# Repo Assumptions & Reality Check

## Verified Facts
*   **Infrastructure**: Node.js 18+, pnpm, Docker Compose.
*   **Backend**: `server/` directory contains a Node.js/TypeScript application.
*   **Database**: Postgres (managed migrations) and Neo4j.
*   **Migrations**: Located in `server/db/managed-migrations/`. System expects `.up.sql` and `.down.sql` files.
*   **GraphQL**:
    *   Main schema definition: `server/src/graphql/schema.ts` (exports `typeDefs`).
    *   Resolvers aggregation: `server/src/graphql/resolvers/index.ts`.
    *   Directives: `authDirective.ts` implements `@scope` and `@auth`.
*   **Modules**: `server/src/modules/` is the location for domain modules.
*   **Testing**: Jest is used for testing (`server/__tests__`).

## Cognitive Ops (CogOps) (PR-17706)
### Verified
- Repository is a pnpm workspace (`pnpm-workspace.yaml` present).
- Schemas live in `schemas/` directory.
- Required checks policy file exists (`docs/ci/REQUIRED_CHECKS_POLICY.yml`).
- Evidence schemas exist (report/metrics/stamp).
- Primary docs tree is `docs/`.

### Deferred Pending Verification
- CogOps demo script path (`scripts/cogops/run_demo_fixture.sh`).
- Dedicated CogOps CI job naming (`cogops:tests`).
- Evidence bundle conventions for CogOps.

## CogSec Radar (PR-17708)
### CogSec Verified
1.  **Required Checks Source**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` is authoritative for required checks.
2.  **Audit & RBAC Surfaces**: `audit/` and `rbac/` directories exist for audit artifacts and RBAC utilities.
3.  **Docs Baselines**: `docs/security/CIS_CONTROLS_CHECKLIST.md` exists for security baseline references.

### CogSec Deferred Pending
1.  **GA Plan Location**: `docs/archive/root-history/GA-Plan.md` contains current GA plan.
2.  **RBAC Middleware Location**: Specific API RBAC middleware entrypoints remain to be pinpointed.

## NATO Cognitive Alerts (PR-17709)
### Verified
- MIT license present at repo root.
- Key top-level directories present: `alerting/`, `active-measures-module/`, `adversarial-misinfo-defense-platform/`, `api/`, `api-schemas/`, `apps/`, `RUNBOOKS/`, `SECURITY/`.

### Assumed
- Alert ingestion and UI surfaces can consume new alert types.

## Narrative Intelligence Subsumption (PR-17713)
### Verified (Local Inspection)
- `docs/security/` and `docs/ops/runbooks/` exist and are active documentation surfaces.
- Feature flags are documented under `docs/FEATURE_FLAGS.md`.
- Playwright configuration exists in the repo root (`playwright.config.ts`).

## Assumptions
*   The `server/db/managed-migrations` path is correctly configured in the environment where `npm run migrate` runs.
*   The `MigrationManager` is robust enough to handle new tables without manual intervention.
*   The `@scope` directive is fully functional and wired up.

## "Do Not Touch" List
*   `.pnpm-store/`, `.qwen-cache/`, `.archive/`, `GOLDEN/datasets/`.
*   Existing migration files in `server/db/managed-migrations/`.
*   `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/*`, `docs/ga/*`.
*   `agent-contract.json`, `CODEOWNERS`.
*   `THIRD_PARTY_NOTICES/` and existing license headers.

## Validation Plan
1. Confirm existing evidence bundle generators and naming conventions.
2. Identify current CI required checks and ensure cogops gating aligns.
3. Locate any existing cognitive-ops or misinfo modules to reuse.
