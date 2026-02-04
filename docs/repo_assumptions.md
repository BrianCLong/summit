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

## NATO Cognitive Alerts (PR-17709)
### Verified
- MIT license present at repo root.
- Key top-level directories present: `alerting/`, `active-measures-module/`,
  `adversarial-misinfo-defense-platform/`, `api/`, `api-schemas/`, `apps/`,
  `RUNBOOKS/`, `SECURITY/`.

### Assumed
- JS/TS monorepo using `pnpm`, Jest, and linting.
- Alert ingestion and UI surfaces can consume new alert types.

## Narrative Intelligence Subsumption (PR-17713)
### Verified (Local Inspection)
- `docs/security/` and `docs/ops/runbooks/` exist and are active documentation surfaces.
- Feature flags are documented under `docs/FEATURE_FLAGS.md` and related docs.
- Playwright configuration exists in the repo root (`playwright.config.ts`).

### Deferred Pending Verification
- Exact service runtime locations for narrative analytics modules.
- CI check names and required gates for narrative intelligence changes.
- Existing evidence schema naming and signing conventions used by runtime services.

## Assumptions
*   The `server/db/managed-migrations` path is correctly configured in the environment where `npm run migrate` runs.
*   The `MigrationManager` is robust enough to handle new tables without manual intervention in the database structure (other than running the migration).
*   The `@scope` directive is fully functional and wired up in the schema transformer.

## "Do Not Touch" List
*   `.pnpm-store/`
*   `.qwen-cache/`
*   `.archive/`
*   `GOLDEN/datasets/`
*   Existing migration files in `server/db/managed-migrations/` (unless fixing a bug, which is out of scope).
*   `THIRD_PARTY_NOTICES/` and existing license headers.
*   Existing security policy configs under `.security/` or `SECURITY/` without review.

## Validation Plan (Narrative Intelligence PR-1)
- Locate feature flag evaluation path and tenant allowlist controls.
- Confirm centralized logging/audit pathways for evidence packs.
- Identify artifact naming conventions and hash signing flows.
- Confirm API patterns (REST/GraphQL/WebSocket) and endpoint ownership.
