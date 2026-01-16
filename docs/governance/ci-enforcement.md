Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# CI Enforcement & Governance Automation

This document defines the automated enforcement of Summit's governance model within the CI/CD pipeline.

## 1. Governance → Enforcement Mapping

The following table maps permission tiers to GitHub labels, required checks, and protected paths.

| Tier  | Risk Profile    | Label          | Allowed Paths (Pattern)                                                          | Required Checks                          | Review Requirements                  |
| :---- | :-------------- | :------------- | :------------------------------------------------------------------------------- | :--------------------------------------- | :----------------------------------- |
| **0** | **Low**         | `agent:tier-0` | `docs/**`, `**/*.md`, `**/*.png`, `**/*.jpg`                                     | Linting, Spellcheck                      | None (Auto-merge allowed for Agents) |
| **1** | **Moderate**    | `agent:tier-1` | `apps/web/**`, `client/**`, `tests/**`, `scripts/dev/**`                         | Unit Tests, Build, Lint                  | 1 Peer (Human or Tier-2+ Agent)      |
| **2** | **High**        | `agent:tier-2` | `server/src/**`, `db/migrations/**`, `packages/**`                               | Integration Tests, Security Scan, Sonar  | 1 Code Owner                         |
| **3** | **Critical**    | `agent:tier-3` | `server/src/auth/**`, `server/src/payment/**`, `server/src/crypto/**`            | All Tier 2 + E2E Tests, Audit Log        | 2 Code Owners (1 Security)           |
| **4** | **Existential** | `agent:tier-4` | `policy/**`, `.github/**`, `terraform/**`, `docs/governance/**`, `scripts/ci/**` | All Tier 3 + Admin Approval, Manual Gate | 2 Admins + Manual Gate               |

### Actions & Approvals

| Action      | Governance Check         | Requirement                                   |
| :---------- | :----------------------- | :-------------------------------------------- |
| **Open PR** | `check-pr-labels`        | Must have `agent:tier-*` and `area:*` labels. |
| **Edit CI** | `check-restricted-paths` | Requires `agent:tier-4`.                      |
| **Rebase**  | N/A                      | Allowed for all tiers.                        |
| **Merge**   | `policy-gate`            | All checks passed, reviews met.               |
| **Release** | `release-gate`           | Signed artifacts, SBOM present.               |

---

## 2. Label Taxonomy

The following labels are enforced by CI.

### Tier Labels (Mutually Exclusive)

- `agent:tier-0`: Documentation and non-code assets.
- `agent:tier-1`: Frontend and non-critical application code.
- `agent:tier-2`: Backend logic and data models.
- `agent:tier-3`: Security-sensitive code (Auth, Billing).
- `agent:tier-4`: Infrastructure and Governance definitions.

### Area Labels (At least one required)

- `area:client`
- `area:server`
- `area:docs`
- `area:infra`
- `area:ci`
- `area:governance`
- `area:database`

### Risk Labels (Optional, derived from Tier if missing)

- `risk:low` (Tier 0-1)
- `risk:medium` (Tier 2)
- `risk:high` (Tier 3)
- `risk:release-blocking` (Tier 4)

---

## 3. Branch Protection Profiles

### `main`

- **Require Pull Request reviews before merging:** Yes (2 approvals).
- **Dismiss stale pull request approvals when new commits are pushed:** Yes.
- **Require status checks to pass before merging:**
  - `governance-check`
  - `build`
  - `test`
  - `security-scan`
- **Require signed commits:** Yes.
- **Include administrators:** Yes.
- **Allow force pushes:** No.

### `release/*`

- Same as `main`, plus:
- **Restrict who can push to matching branches:** Release Captains only.

### `integration/*`

- **Require Pull Request reviews:** Yes (1 approval).
- **Require status checks:** `build`, `test`.
- **Allow force pushes:** Yes (for history rewriting).

### `feature/*`

- No protection.

---

## 4. Audit Logging Hooks

Governance decisions are logged in two places:

1.  **GitHub Actions Log:** The `governance-check` workflow emits structured JSON logs.
2.  **Commit Status:** The check reports a status of `pending`, `success`, or `failure` with a description of the violation.
3.  **Artifacts:** A `governance-report.json` is uploaded as a build artifact for every PR.

**Evidence Collected:**

- PR Author (Agent vs Human).
- Assigned Tier Label.
- Files Changed.
- Policy Decision (Allow/Deny).
- Overrides (if any).

---

## 5. How CI Blocks Bad PRs (Explainer)

1.  **Detection**: When a PR is opened or updated, the `governance-check.yml` workflow triggers.
2.  **Analysis**:
    - It reads the labels assigned to the PR.
    - It fetches the list of changed files using the GitHub API.
    - It matches every changed file against the **Allowed Paths** for the assigned **Tier Label**.
3.  **Enforcement**:
    - **Case A (Tier Mismatch):** If a PR is labeled `agent:tier-1` but modifies `server/src/auth/Login.ts` (Tier 3), the check **FAILS**. The error message explicitly states: "File 'server/src/auth/Login.ts' requires Tier 3, but PR is Tier 1."
    - **Case B (Missing Labels):** If the PR has no `agent:tier-*` label, the check **FAILS**.
    - **Case C (Protected Files):** If `.github/workflows/main.yml` is modified, the check verifies that the PR is `agent:tier-4`.
4.  **Blocking**: The check is a "Required Status Check" on `main`. The "Merge" button is disabled until the check passes.
5.  **Resolution**: The author must upgrade the label (which may trigger higher-level review requirements) or revert the changes to restricted files.
