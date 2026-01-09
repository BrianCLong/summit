# Branch Protection Policy (Main)

**Authority:** docs/SUMMIT_READINESS_ASSERTION.md
**Owner:** Platform Engineering
**Last Updated:** 2026-01-09

## Purpose

Branch protection for `main` enforces the GA gates and governance settings defined in policy-as-code. The authoritative required checks live in `docs/ci/REQUIRED_CHECKS_POLICY.yml`, and verification is enforced via CI drift detection.

## Required Status Checks (Always-Required)

The following checks must be green before merge. These are the exact status check names GitHub enforces:

| Check name                                        | Why required                                                                                            | Source workflow                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `Release Readiness Gate / Release Readiness Gate` | Comprehensive readiness validation on every change.                                                     | `.github/workflows/release-readiness.yml`  |
| `GA Gate / GA Readiness Gate`                     | Canonical GA readiness gate via `make ga`.                                                              | `.github/workflows/ga-gate.yml`            |
| `Unit Tests & Coverage / test`                    | Unit test and coverage enforcement.                                                                     | `.github/workflows/unit-test-coverage.yml` |
| `CI Core (Primary Gate) / CI Core Gate ✅`        | Aggregated CI gate that requires lint, tests, verification, deterministic build, and golden path smoke. | `.github/workflows/ci-core.yml`            |

The canonical list is defined in `docs/ci/REQUIRED_CHECKS_POLICY.yml` under `always_required` and mirrored in `docs/ci/REQUIRED_CHECKS_POLICY.json`.

## Required Branch Protection Settings

Policy settings are codified in `docs/ci/REQUIRED_CHECKS_POLICY.yml` under `branch_protection` and include:

- Enforce admins: `true`
- Require pull request reviews: `true`
- Required approvals: `1`
- Require code owner reviews: `true`
- Dismiss stale reviews: `true`
- Require conversation resolution: `true`
- Require linear history: `true`
- Require up-to-date branches for status checks: `true`

## Verification (No Admin Required)

### Local

```bash
./scripts/release/check_branch_protection_drift.sh --branch main --strict
```

Strict mode exits non-zero when drift or API access issues are detected. For fork PRs without branch protection visibility, the script fails with an explicit message and should be re-run on `main` or via the scheduled workflow.

### CI

- **Job:** `branch-protection:verify`
- **Workflow:** `.github/workflows/branch-protection-verify.yml`
- **Triggers:** `pull_request` (read-only), nightly schedule (authoritative drift detection)

The job runs in strict mode and fails loudly if the branch protection settings or required status checks deviate from policy.

## Apply (Admin-Gated)

Applying branch protection changes requires admin privileges. Use one of the following governed paths:

### Plan & Apply via Script (Preferred)

```bash
./scripts/release/reconcile_branch_protection.sh --branch main --mode plan
```

Review the generated artifacts in `artifacts/release-train/` before applying. To apply changes, run:

```bash
./scripts/release/reconcile_branch_protection.sh --branch main --mode apply --i-understand-admin-required true
```

### Manual Apply (UI)

1. Settings → Branches → Branch protection rules
2. Edit the `main` rule
3. Align required status checks and branch protection settings with `docs/ci/REQUIRED_CHECKS_POLICY.yml`

## Evidence & Artifacts

- Policy: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- Verification reports: `artifacts/release-train/branch_protection_drift_report.{md,json}`
- Drift runbook: `docs/ci/BRANCH_PROTECTION_DRIFT.md`
