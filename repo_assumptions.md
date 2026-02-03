# Repo Assumptions — Summit Verified Change (SVC) Recon

## ✅ Verified (current repo state)
- **License**: MIT license is present at root (`LICENSE`).
- **Primary toolchains**:
  - **Node/TypeScript** workspace managed by pnpm (`package.json`, `pnpm-workspace.yaml`).
  - **Python** project metadata for Python 3.11+ (`pyproject.toml`).
  - **Rust** workspace present (`Cargo.toml`).
- **Governance required checks policy**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` defines required status checks for `main`.
- **Artifacts baseline**:
  - `artifacts/agent-runs/` exists for agent run artifacts.
  - CI standards document defines compliance receipt artifacts under `artifacts/compliance-receipts/`.
- **Existing verification infrastructure**:
  - Repo-level verification suite in `scripts/verify.ts`.
  - Runtime verification runner in `scripts/verification/verify_runtime.ts`.

## ❓ Assumptions (deferred pending verification)
1. **Branch protection check names**: Must match `docs/ci/REQUIRED_CHECKS_POLICY.yml` in GitHub branch protection UI/API.
   - **How to verify**: Inspect branch protection via GitHub API or UI and compare exact check names.
2. **Artifacts conventions beyond compliance receipts**: Additional evidence/verification artifact conventions may exist in `evidence/` or `artifacts/` subpaths.
   - **How to verify**: Enumerate `artifacts/` and `evidence/` conventions referenced in docs and scripts.
3. **Existing verification schema conventions**: Deterministic evidence schemas may already be defined in `schemas/` or `evidence/`.
   - **How to verify**: Search for `*.schema.json` in `schemas/` and `evidence/` and review naming patterns.
4. **Required check enforcement for new workflows**: Any new optional workflow (e.g., `svc-verify`) must be additive and feature-flagged.
   - **How to verify**: Confirm policy gate rules in `docs/ci/REQUIRED_CHECKS_POLICY.yml` and release-gate workflows.

## 🔒 Must-not-touch (until explicit gate review)
- `.github/workflows/*` (additive edits only, gated and feature-flagged).
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (change only with explicit governance review).
- Security policies under `SECURITY/` (extend only, do not rewrite).

## Validation checklist (run before implementation)
1. Identify primary language/toolchain from root manifests (`package.json`, `pyproject.toml`, `Cargo.toml`).
2. List required status checks from `docs/ci/REQUIRED_CHECKS_POLICY.yml` and confirm against GitHub branch protection settings.
3. Find current artifact schemas and conventions under `artifacts/` and `evidence/`.
4. Locate existing verification or policy-test infrastructure in `scripts/` and `docs/` for alignment.
