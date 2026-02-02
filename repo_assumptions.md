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

---

## Vulnerability Resilience - OSV Ingestion (Assumptions)

### Vuln Verified
- **Python**: 3.12.12 in sandbox; 3.9 in `api/Dockerfile`.
- **Pydantic**: v2 present in `requirements.in`.
- **Structure**: `summit/`, `scripts/`, `tests/` directories exist at root.
- **Policies**: `tests/test_neverlog.py` and `tests/test_evidence_determinism.py` exist.
- **Schemas**: `schemas/` exists for global JSON schemas.
- **Flags**: `summit/flags.py` exists for feature flag management.

### Vuln Assumed (validate)
- `summit/vuln/` is the appropriate place for core vulnerability logic in Python.
- `scripts/vuln/` is appropriate for ingestion entry points.
- `tests/vuln/` is appropriate for module-specific tests.
- `artifacts/vuln-intel/hand-cve-private-sector/` is the target for evidence.

### Vuln Must-not-touch
- Existing vulnerability scanning tools like `scripts/scan-vulnerabilities.sh` (interop only).
- `api/main.py` existing endpoints.
- Base evidence schemas in `schemas/`.

### Vuln Validation plan
- Verify OSV API response format matches assumptions.
- Confirm deterministic output of `VulnRecord` normalization.

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