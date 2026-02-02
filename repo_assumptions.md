# repo_assumptions.md

## Repository Verified Items

- Repository contents inspected locally; subsumption bundles and verifier script exist.
- CI uses GitHub Actions workflows under `.github/workflows/`.
- Evidence schemas and index live under `evidence/`.

## Repository Assumptions (validate ASAP)

- Required status check names remain to be confirmed against branch protection.
- Summit prefers deterministic evidence: separate report/metrics/stamp artifacts.

## Repository Must-not-touch (until validated)

- Public API surfaces in `packages/**` (no breaking changes).
- Existing GA gates / branch protection requirements.
- Deployment configs / secrets / infra definitions.

## Repository Validation plan

- Enumerate required checks via GitHub branch protection UI/API.
- Confirm test runner (jest/vitest) and lint tooling.

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
