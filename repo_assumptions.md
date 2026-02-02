# Repo Assumptions & Verifications

## Verified
1.  **Repo Structure**: Top-level directories include `api/`, `apis/`, `api-schemas/`, `apps/`, `bindings/`, `alerting/`, `RUNBOOKS/`, `SECURITY/`.
2.  **Package Location**: `packages/` is the standard location for modules.
3.  **Package Scope**: `@intelgraph` is the naming convention (e.g., `@intelgraph/disinformation-detection`).
4.  **Validation Library**: `ajv` is present in root `devDependencies`.
5.  **Testing**: `vitest` and `jest` are available. I will use `vitest` as it seems to be the modern standard in this repo (found in `scripts/` and root `package.json`).
6.  **Workspace**: `pnpm` workspaces are used.
7.  **Governance**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` exists and defines the "CI Core (Primary Gate)" and other required checks.
8.  **Runtime (`api/`)**:
    - **Language**: Python 3.9 (Verified via `api/Dockerfile`).
    - **Framework**: FastAPI (Verified via `api/main.py`).
    - **Database**: Neo4j and Redis drivers present.
    - **Observability**: OpenTelemetry configured.
9.  **Bindings**: `bindings/ibrs-node` is a Node.js binding backed by Rust (`@napi-rs/cli`).

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

## Repository Validation plan
*   Enumerate required checks via GitHub branch protection UI/API.
*   Confirm test runner (jest/vitest) and lint tooling.
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