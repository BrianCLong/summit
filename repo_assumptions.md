# Repo Assumptions & Verifications

## Verified
1.  **Repo Structure**: Top-level directories include `api/`, `apis/`, `api-schemas/`, `apps/`, `bindings/`, `alerting/`, `RUNBOOKS/`, `SECURITY/`.
2.  **Package Location**: `packages/` is the standard location for modules.
3.  **Package Scope**: `@intelgraph` is the naming convention (e.g., `@intelgraph/disinformation-detection`).
4.  **Validation Library**: `ajv` is present in root `devDependencies`.
5.  **Testing**: `vitest` and `jest` are available for Node.js; `pytest` is used for Python `api/` (Verified via `api/` check).
6.  **Workspace**: `pnpm` workspaces are used.
7.  **Governance**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` exists and defines the "CI Core (Primary Gate)" and other required checks.
8.  **Runtime (`api/`)**:
    - **Language**: Python 3.9 (Verified via `api/Dockerfile`).
    - **Framework**: FastAPI (Verified via `api/main.py`).
    - **Database**: Neo4j and Redis drivers present.
    - **Observability**: OpenTelemetry configured.
9.  **Bindings**: `bindings/ibrs-node` is a Node.js binding backed by Rust (`@napi-rs/cli`).
10. **Server Entry Point**: `server/src/app.ts` (Express app configuration)
11. **Feature Flags**: `feature-flags/flags.yaml`

## Assumptions
1.  **New Package**: `packages/disinfo-ops` is a new package and does not conflict with existing work (verified by absence).
2.  **Schema Standard**: We are defining new schemas for "Ops-first" pipeline, but loosely aligning with `evidence/*.schema.json` conventions (e.g., separating report, metrics, stamp).
3.  **Required Checks**: Required status check names remain to be confirmed against branch protection.
4.  **Deterministic Evidence**: Summit prefers deterministic evidence: separate report/metrics/stamp artifacts.
5.  **Platform Spine**: New services will use Python/FastAPI to match `api/` spine.
6.  **Queue**: `maestro` package likely handles orchestration; specific queue technology (Celery vs Redis Queues) needs confirmation.

## Must-not-touch
*   `docs/ci/REQUIRED_CHECKS_POLICY.yml` (Governance-controlled).
*   Security scanning workflows (unless required).
*   Public API surfaces in `packages/**` (no breaking changes).
*   Existing GA gates / branch protection requirements.
*   Deployment configs / secrets / infra definitions.
*   `SECURITY/*` baselines (Extend only, don't rewrite).
*   `api/main.py` existing endpoints (wargame simulation) should be preserved.

## Repository Validation plan
*   Enumerate required checks via GitHub branch protection UI/API.
*   Confirm test runner (pytest for api, jest/vitest for server).
*   Verify `maestro` queue mechanism.

---

## Ingress NGINX Retirement Bundle (Assumptions)

### Ingress Verified
- Bundle manifest and docs are now present under `subsumption/ingress-nginx-retirement` and `docs/**`.

### Ingress Assumed (validate)
- GitHub Actions required checks can be updated to include bundle-specific gates.
- CI runners have Node.js 20+ available for the bundle verifier and deny gate scripts.

### Ingress Must-not-touch (blast radius)
- Runtime API surfaces and production deployment logic outside CI gating.

### Ingress Validation plan
- Confirm required check names in branch protection.
- Confirm CI execution for `scripts/ci/verify_subsumption_bundle.mjs`.

---

## FactMarkets - Financial Fraud Detection (Assumptions)

### FactMarkets Verified
- Existing `schemas/` directory contains Lane 1 evidence schemas.
- `package.json` supports `tsx` for running TypeScript scripts.
- `pnpm` workspace structure exists but `factmarkets` will be a root module initially.

### FactMarkets Assumed (validate)
- `factmarkets/` at root is acceptable placement for this module (mirroring `adversarial-misinfo-defense-platform` pattern).
- `fixtures/factmarkets` is the correct place for test data.
- Deterministic JSON output is required for all evidence artifacts.

### FactMarkets Must-not-touch (until validated)
- `packages/` public APIs.
- Existing CI workflows (unless adding new specific jobs).

### FactMarkets Validation plan
- Verify schemas against JSON Schema draft 2020-12.
- Verify deterministic output via `stableStringify`.

---

## FactFlow - Evidence Ingestion (Assumptions)

### FactFlow Verified
- `server/src/app.ts` exists.
- `feature-flags/flags.yaml` exists.

### FactFlow Assumed (validate)
- `server/src/factflow/` is used to contain the new module, keeping it close to the server logic but distinct.
- `server/src/factflow/schema/` is used for module-specific schemas to avoid polluting the root `schemas/` directory initially.
- New `EVD-` IDs will be generated using a SHA256 deterministic hash.

### FactFlow Must-not-touch (until validated)
- Existing security workflows.
- `server/src/middleware/auth.ts` (unless absolutely necessary, use existing auth).

---

## FactGov - Regulated Procurement (Assumptions)

### FactGov Verified
- `api/` service is intended to host the FactGov module.
- `api/` currently uses simple API Key authentication (`X-API-Key`).

### FactGov Assumed (validate)
- `api/` service can be integrated into the broader system (e.g. via API Gateway or direct calls).
- Python 3.11+ is the target version (based on `api/Dockerfile` check).

### FactGov Must-not-touch (until validated)
- Existing wargame simulation endpoints in `api/main.py`.

---

## Disinfo News Ecosystem - Content Integrity (Assumptions)

### Disinfo Verified
- `packages/` workspace structure is supported.
- `scripts/monitoring/` is established for drift detection scripts.
- `fixtures/` is the standard for test data.

### Disinfo Assumed (validate)
- New TypeScript module in `packages/disinfo-news-ecosystem` is preferred over expanding the existing Python platform for this capability.
- CI/CD will automatically incorporate the new `disinfo.yml` workflow.

### Disinfo Must-not-touch (until validated)
- Global `pnpm-lock.yaml` integrity (regenerate after merge).

---

## FactCert - Regulated Credentialing (Assumptions)

### FactCert Verified
- `packages/` directory exists for new subsystem placement.
- Deterministic artifact standard is required for credential issuance.

### FactCert Assumed (validate)
- `packages/factcert` is the correct location for core schemas and crypto libs.
- Ed25519 is the approved signing algorithm for deterministic audit trails.

### FactCert Must-not-touch (until validated)
- Existing `evidence/` schemas used by other subsystems.\n---\n
# Repo Assumptions & Reality Check

## FactCert Subsystem Status
*   **Status:** Missing / Green field.
*   **Target Location:** `packages/factcert/`
*   **Workspace:** Part of `packages/*` workspace in `pnpm-workspace.yaml`.

## Conventions Assumed
*   **Package Name:** `@intelgraph/factcert`
*   **Testing:** `vitest` (consistent with repo memory/other packages).
*   **Building:** `tsx` for execution, `tsc` for type checking.
*   **Artifacts:** `artifacts/factcert/` (standard artifact output location).
*   **Fixtures:** `fixtures/factcert/` (standard fixture location).
*   **Schemas:** JSON Schemas in `packages/factcert/schema/*.schema.json`.
*   **Linting:** Standard repo eslint/prettier config.

## Missing Elements to Create (PR1)
*   Package scaffold (`package.json`, `tsconfig.json`).
*   Core Libraries:
    *   `src/lib/stable_json.ts` (Determinism).
    *   `src/lib/hashchain.ts` (Audit trail).
    *   `src/lib/ed25519.ts` (Signing).
*   Schemas:
    *   `credential.schema.json`
    *   `audit_trail.schema.json`
    *   `controls_report.schema.json`
    *   `stamp.schema.json`
*   Fixtures:
    *   `user.json`
    *   `credential_example.json`

## CI/CD
*   No existing CI checks for `factcert`.
*   New checks will need to be added to `required_checks.todo.md` or similar if we were editing workflows (out of scope for PR1 code changes, but noted).

## Constraints
*   **Determinism:** Must use canonical JSON stringification.
*   **No PII:** Strict separation of concerns.
*   **Regulated Output:** No "admissible", "compliant", "fraud" claims in code strings/outputs.
\n---\n
# Repo Assumptions

## FactCert Location
- `FactLaw` and `FactMarkets` packages described in the requirements were not found in the file system.
- `FactCert` will be implemented as a new package in `packages/factcert`.
- This location aligns with the monorepo structure observed in `packages/`.

## Fixtures
- Fixtures will be stored in `fixtures/factcert/` to keep them separate from the source code but accessible for tests and CLI usage.

## CLI
- The CLI entry point will be structured within `packages/factcert/src/cli.ts` (to be implemented later).
- Execution will be via `pnpm` scripts defined in the root `package.json` or `packages/factcert/package.json`.

## Dependencies
- Using `node:crypto` for Ed25519 signing as per requirements.
- Using `vitest` for testing as it is already present in the root `package.json`.

## Must-Not-Touch
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (if it exists)
- Existing security scanning baselines.
\n---\n
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
