# Repo Reality Check — GitHub Files Changed Governance (2026-02-05)

## Evidence Bundle (UEF)
- CODEOWNERS files are present at `/CODEOWNERS` and `/.github/CODEOWNERS`.
- Branch protection and required-check policy references exist in `/.github/branch-protection-rules.md`, `/.github/required-checks.yml`, and `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
- Branch protection reconciliation workflow exists at `/.github/workflows/branch-protection-reconcile.yml`.
- Workflows live under `/.github/workflows/` with guidance in `/.github/workflows/README.md`.
- Governance documentation and CI standards live in `docs/ci/` and `docs/governance/`.
- Evidence and artifact stores are present at `/artifacts`, `/evidence`, and `/release-artifacts`.
- Core top-level directories include `/docs`, `/scripts`, `/tests`, and `/test`.

## Verified Repo Conventions (Present State)
- **CODEOWNERS locations:** `/CODEOWNERS` and `/.github/CODEOWNERS` are authoritative inputs for ownership review rules.
- **Required checks policy:** `docs/ci/REQUIRED_CHECKS_POLICY.yml` and `docs/ci/REQUIRED_CHECKS_POLICY.json` define policy expectations; `/.github/required-checks.yml` and `/.github/branch-protection-rules.md` record operational settings.
- **Branch protection drift controls:** `/.github/workflows/branch-protection-reconcile.yml` is the existing reconciliation entrypoint.
- **Workflow governance:** `/.github/workflows/README.md` documents required checks and modification cautions.
- **Evidence storage:** `/artifacts`, `/evidence`, and `/release-artifacts` are established evidence stores.

## Assumptions (Deferred Pending Validation)
- **Check name alignment:** exact check names in GitHub branch protection settings should be confirmed against `/.github/required-checks.yml` and `docs/ci/REQUIRED_CHECKS_POLICY.yml` before enforcement changes.
- **Protected path policy source-of-truth:** a dedicated policy file for protected paths is not yet observed and should be established if enforcement is required.

## Must-Not-Touch List (Governed Default for This Work)
- `/artifacts/**`
- `/evidence/**`
- `/release-artifacts/**`
- `/docs/generated/**`

## Recommended Next Checks (Deterministic)
1. Confirm CODEOWNERS coverage scopes against `/CODEOWNERS` and `/.github/CODEOWNERS`.
2. Compare required checks in GitHub settings vs `docs/ci/REQUIRED_CHECKS_POLICY.yml` and `/.github/required-checks.yml`.
3. Validate evidence artifact schemas and naming conventions in `/artifacts` and `/evidence` before adding new reports.

## Check Name Candidates (Present State)
- `policy/branch-protection-reconcile` (from `/.github/workflows/branch-protection-reconcile.yml`)
- `release/rc` (from `/.github/workflows/release-rc.yml`)
- `release/ga` (from `/.github/workflows/release-ga-pipeline.yml`)

## Decision
Summit will treat CODEOWNERS + branch protection parity as enforceable only after the check name alignment step is complete.
