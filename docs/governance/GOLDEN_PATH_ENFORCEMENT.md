# Golden Path Enforcement Packet

## A) Required Checks Strategy

### Minimum Viable Required Checks (PRs to main)

**Stage 1: Standardization (Current State)**
We require individual stable jobs that cover distinct governance domains. This minimizes the "blast radius" of a single failure while ensuring coverage.

| Check Name | Source Workflow | Purpose |
| :--- | :--- | :--- |
| **`Governance / Unified Gate`** | `ci-core.yml` | **Primary CI Gate.** Aggregates lint, unit/integration tests, build determinism, and drift checks. (Currently named `CI Core Gate ✅`) |
| **`Governance / GA Readiness`** | `ga-gate.yml` | **Release Readiness.** verification via `make ga`. (Currently named `GA Readiness Gate`) |
| **`Governance / Docs Integrity`** | `docs-lint.yml` | **Documentation.** Validates markdown syntax and broken links. (Currently named `Markdown Linter`) |
| **`Governance / Evidence ID Consistency`** | `verify-claims.yml` | **Compliance.** Validates `CLAIMS_REGISTRY.md` evidence links. (Currently named `validate-claims`) |

**Stage 2: Unification (Target State)**
Once Stage 1 is stable (3 consecutive green runs across all jobs), we will consolidate into a single "Unified Gate" to reduce GitHub Status noise.

*   **Required Check:** `Governance / Unified Gate`
*   **Behavior:** This job will `needs: [governance-ga-readiness, governance-docs-integrity, ...]` and only pass if all upstream governance jobs pass.

### Required Checks for Release Tags
Release tags (`v*`) require stricter verification than PRs.

*   **`Governance / Unified Gate`**: Must pass.
*   **`Governance / GA Readiness`**: Must pass (includes `make ga` evidence generation).
*   **`Evidence Collection`**: Must pass (runs in `evidence-collection.yml`).

### Required Checks for Protected Branches
*   **Target:** `main`
*   **Policy:** `docs/ci/REQUIRED_CHECKS_POLICY.yml` (Source of Truth)

---

## B) Branch Protection Policy-as-Code

We utilize a GitOps approach to branch protection. The policy is defined in YAML and enforced via a drift detection script.

**Policy File:** `docs/ci/REQUIRED_CHECKS_POLICY.yml`

```yaml
version: "2.1.0"
description: "Golden Path Governance Enforcement"

branch_protection:
  branch: "main"
  required_status_checks:
    strict: true
    contexts:
      # The Golden Path Governance Suite
      - "Governance / Unified Gate"
      - "Governance / GA Readiness"
      - "Governance / Docs Integrity"
      - "Governance / Evidence ID Consistency"

# Drift Detection
drift_check:
  schedule: "0 * * * *" # Hourly
  script: "scripts/ci/check_branch_protection_drift.mjs"
  remediation: "ALLOW_BRANCH_PROTECTION_CHANGES=1 pnpm ci:branch-protection:apply"
```

**Drift Detection & Remediation:**
1.  **Detect:** The `Governance / Branch Protection Drift` job (inside `ci-core.yml`) runs `check_branch_protection_drift.mjs`. It fails CI if GitHub settings do not match the YAML policy.
2.  **Remediate:** Admins run `pnpm ci:branch-protection:apply` locally or trigger a manual dispatch workflow to sync settings.

---

## C) CI Job Naming and Stability Rules

### Naming Standards
All required checks MUST follow the `Governance / <Domain>` pattern. This signals to developers that these are non-negotiable governance gates.

| Old Name | **New Standard Name** |
| :--- | :--- |
| `CI Core Gate ✅` | **`Governance / Unified Gate`** |
| `GA Readiness Gate` | **`Governance / GA Readiness`** |
| `Markdown Linter` | **`Governance / Docs Integrity`** |
| `validate-claims` | **`Governance / Evidence ID Consistency`** |
| `Branch Protection Drift` | **`Governance / Branch Protection Drift`** |

### Stability Rules
1.  **No Dynamic Names:** Job names must be static strings. Dynamic matrices should be wrapped by a static "Gate" job.
2.  **Artifact Conventions:**
    *   All governance jobs must upload artifacts to `artifacts/governance/<job-name>/`.
    *   Evidence bundles must be stamped with `run_id` and `sha`.
3.  **Renaming Protocol:**
    *   Renaming a required check requires a **migration plan** because it will immediately unprotect the branch (GitHub treats the new name as a "new" check).
    *   **Procedure:** Add new name -> Merge -> Update Policy -> Remove old name.

---

## D) Rollback and Emergency Procedures

### Emergency Bypass (Time-Bounded)
If a governance check is broken and blocking critical hotfixes:

1.  **Add Exception:** Create an entry in `docs/ga/EXCEPTIONS.yml` (if supported) or temporarily modify `docs/ci/REQUIRED_CHECKS_POLICY.yml` in the hotfix branch.
2.  **Admin Override:** Repository Admins can force-merge without checks. This action generates an audit log entry.

### Quick Un-Require (Rollback)
If a check is fundamentally broken (e.g., CI infrastructure failure):

1.  **Edit Policy:** Remove the failing context from `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
2.  **Apply:** Run `pnpm ci:branch-protection:apply`.
3.  **Verify:** Confirm the check is no longer "Required" in the PR UI.

### Restoration
1.  Fix the root cause.
2.  Verify the fix with 3 consecutive green runs.
3.  Re-add the context to `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
4.  Apply policy.

---

## E) Implementation Plan (PR-sized)

This plan moves us from the current fragmented state to the Golden Path.

1.  **PR 1: Rename `CI Core` Gate**
    *   Modify `ci-core.yml`: Rename `CI Core Gate ✅` to `Governance / Unified Gate`.
    *   Update `REQUIRED_CHECKS_POLICY.yml`: Add new name, keep old name (transitional).

2.  **PR 2: Rename `GA Readiness` Gate**
    *   Modify `ga-gate.yml`: Rename `GA Readiness Gate` to `Governance / GA Readiness`.
    *   Update `REQUIRED_CHECKS_POLICY.yml`.

3.  **PR 3: Standardize Docs & Evidence Jobs**
    *   Modify `docs-lint.yml`: Rename job to `Governance / Docs Integrity`.
    *   Modify `verify-claims.yml`: Rename job to `Governance / Evidence ID Consistency`.
    *   Update `REQUIRED_CHECKS_POLICY.yml`.

4.  **PR 4: Cleanup & Finalize Policy**
    *   Remove old job names from `REQUIRED_CHECKS_POLICY.yml`.
    *   Apply the new policy using `pnpm ci:branch-protection:apply`.

5.  **PR 5: Integrate Governance Jobs into Unified Gate (Stage 2)**
    *   Update `ci-core.yml` to `needs` the external workflow checks (if using workflow call) or just document the dependency structure.

6.  **PR 6: Release Workflow Gating**
    *   Update `release-ga.yml` to explicitly require `Governance / Unified Gate` status before cutting a release.
