# Repo Assumptions & Verifications

## Verified
1.  **Repo Structure**: Top-level directories include `apps/`, `packages/`, `server/`, `client/`, `scripts/`, `docs/`, `api/`, `apis/`, `api-schemas/`, `bindings/`, `alerting/`, `RUNBOOKS/`, `SECURITY/`. (Verified via repo root listing.)
2.  **App Surface**: `apps/web/` exists alongside multiple application entrypoints. (Verified via `apps/` listing.)
3.  **Package Location**: `packages/` is the standard location for modules. (Verified via repo root listing.)
4.  **Package Scope**: `@intelgraph` is the naming convention (e.g., `@intelgraph/disinformation-detection`). (Verified via `package.json` workspace usage.)
5.  **Validation Library**: `ajv` is present in root `devDependencies`. (Verified via `package.json`.)
6.  **Testing**: `vitest` and `jest` are available for Node.js via root scripts; Playwright is present for e2e. (Verified via `package.json`.)
7.  **Workspace**: `pnpm` workspaces are used. (Verified via `package.json`.)
8.  **Governance**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` exists and enumerates required checks, including "CI Core (Primary Gate)", "GA Gate", "Release Readiness Gate", "SOC Controls", "Unit Tests & Coverage", and "ga / gate". (Verified via policy file.)
9.  **RBAC Utilities**: `rbac/` exists with role inference and drift monitor utilities. (Verified via `rbac/` listing.)
10. **Audit Artifacts**: `audit/` exists with evidence registries and compliance mappings. (Verified via `audit/` listing.)
11. **Server Entry Point**: `server/src/app.ts` is present as the Express app configuration. (Verified via repo path.)
12. **Feature Flags**: `feature-flags/flags.yaml` exists. (Verified via repo path.)
13. **Security Baseline**: `docs/security/CIS_CONTROLS_CHECKLIST.md` exists. (Verified via docs path.)

## Assumptions
1.  **CogSec Package Placement**: The CogSec core package should live under `packages/` once the architecture target is confirmed by owners. (Deferred pending target package taxonomy decision.)
2.  **Schema Standard**: New evidence schemas should align with existing evidence/stamp/report separation conventions. (Deferred pending evidence schema review.)
3.  **Required Checks**: Branch protection in GitHub should align to `docs/ci/REQUIRED_CHECKS_POLICY.yml`; branch protection API parity is deferred pending drift validation run.
4.  **Deterministic Evidence**: Summit prefers deterministic evidence artifacts with stable hashes and no timestamps. (Deferred pending confirmation with evidence contracts.)
5.  **Platform Spine**: New services should align with existing API spines, with placement determined after reviewing current service boundaries. (Deferred pending service ownership input.)
6.  **Queue**: `maestro` orchestration details remain to be confirmed. (Deferred pending queue ownership review.)

## Must-not-touch
*   `docs/ci/REQUIRED_CHECKS_POLICY.yml` (Governance-controlled).
*   Security scanning workflows (unless required).
*   Public API surfaces in `packages/**` (no breaking changes).
*   Existing GA gates / branch protection requirements.
*   Deployment configs / secrets / infra definitions.
*   `SECURITY/*` baselines (Extend only, don't rewrite).
*   `api/main.py` existing endpoints (wargame simulation) should be preserved.

## CogSec Radar - Repo Reality Check

### CogSec Verified
1.  **Required Checks Source**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` is authoritative for required checks. (Verified.)
2.  **Audit & RBAC Surfaces**: `audit/` and `rbac/` directories exist for audit artifacts and RBAC utilities. (Verified.)
3.  **Docs Baselines**: `docs/security/CIS_CONTROLS_CHECKLIST.md` exists for security baseline references. (Verified.)

### CogSec Deferred Pending
1.  **GA Plan Location**: `docs/reports/GA-Plan.md` is not present; the current GA plan artifact is under `docs/archive/root-history/GA-Plan.md`. (Intentionally constrained pending governance direction.)
2.  **RBAC Middleware Location**: Specific API RBAC middleware entrypoints remain to be pinpointed. (Deferred pending targeted search within `server/` and `apps/`.)

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
