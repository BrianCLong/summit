# repo_assumptions.md

## Verified

- Repository contents inspected locally; subsumption bundles and verifier script exist.
- CI uses GitHub Actions workflows under `.github/workflows/`.
- Evidence schemas and index live under `evidence/`.
- Top-level directories consistent with multi-surface platform (`api/`, `packages/`, `scripts/`, `docs/`).
- Testing frameworks: `vitest` and `jest` are present in `package.json`.
- `docs/ops/runbooks/` and `docs/security/data-handling/` directories exist.

## Assumed (validate ASAP)

- Required status check names remain to be confirmed against branch protection.
- Summit prefers deterministic evidence: separate report/metrics/stamp artifacts.
- `scripts/execution/` directory needs to be created.

## Must-not-touch (until validated)

- `.github/workflows/*` (avoid CI breakage).
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (if governance-controlled).
- `SECURITY/*` (extend-only).
- Public API surfaces in `packages/**` (no breaking changes).
- Existing GA gates / branch protection requirements.
- Deployment configs / secrets / infra definitions.

## Validation plan

- Enumerate required checks via GitHub branch protection UI/API.
- Confirm test runner (jest/vitest) and lint tooling. (Verified: `jest` and `vitest` are dependencies).

## Ingress NGINX Retirement Bundle (Assumptions)

### Verified

- Bundle manifest and docs are now present under `subsumption/ingress-nginx-retirement` and `docs/**`.

### Assumed (validate)

- GitHub Actions required checks can be updated to include bundle-specific gates.
- CI runners have Node.js 20+ available for the bundle verifier and deny gate scripts.

### Must-not-touch (blast radius)

- Runtime API surfaces and production deployment logic outside CI gating.

### Validation plan

- Confirm required check names in branch protection.
- Confirm CI execution for `scripts/ci/verify_subsumption_bundle.mjs`.
