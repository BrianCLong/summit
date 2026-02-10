# Merge Surge Runbook
## CI/CD Throughput Management

### Overview
**Merge Surge Mode** is a high-throughput configuration for the Summit CI/CD pipeline. It optimizes for merge velocity during periods of high PR volume by deferring expensive, non-blocking validation jobs to the Merge Queue or the post-merge phase.

### The Kill Switch
The entire Merge Surge architecture is controlled by a single repository variable:

*   **Variable Name:** `MERGE_SURGE`
*   **Location:** Repository Settings -> Variables -> Actions
*   **Values:**
    *   `true`: **Surge Mode Active.** Expensive jobs are skipped on PR pushes.
    *   `false`: **Standard Mode.** All mandatory and recommended checks run on every PR commit.

### Change Control & Audit Trail
Changing the `MERGE_SURGE` status is a **tier-1 operational change**.
1.  **Open an Issue:** Create a "CI Scaling" issue describing why the toggle is needed (e.g., "Release v4.2 Crunch").
2.  **Toggle the Variable:** Update the value in GitHub Settings.
3.  **Document the Change:** Add a line to the table below via a PR to this file.

| Date | New State | Reason | Operator | Issue Ref |
| :--- | :--- | :--- | :--- | :--- |
| 2026-02-09 | `true` | Initial Surge Mode activation for merge recovery | Gemini Agent | N/A |
| 2026-02-10 | `true` | System hardening and lock-in | Gemini Agent | N/A |

### What Changes in Surge Mode?
When `MERGE_SURGE=true`, the following behaviors are active:

1.  **PR Load Shedding:**
    *   `Deterministic Build` job is **skipped** on PRs.
    *   `Golden Path Smoke Test` job is **skipped** on PRs.
    *   `E2E Playwright Tests` job is **skipped** on PRs.
    *   `Golden Path Supply Chain` (Docker builds) is **skipped** on PRs.
2.  **Merge Queue Enforcement:**
    *   The expensive jobs above **RUN** during the Merge Queue phase (`merge_group` event).
    *   This ensures that no code is merged to `main` without passing the full suite, but developers don't have to wait 45+ minutes for feedback on every commit.
3.  **Gate Success Semantics:**
    *   The `CI Core Gate ✅` (the primary required check) treats `skipped` results as `success`.

### Critical Safety: Workflow Validity Gate
Regardless of `MERGE_SURGE` status, the **Workflow Validity Gate** is **ALWAYS ACTIVE** and **MANDATORY** for any PR touching `.github/workflows/**`.
*   This catches duplicated `if:` keys, malformed YAML, and invalid expressions *before* they can cause a global CI outage.
*   **Check Name:** `Workflow Validity Gate / Workflow Validity Check`

### Exit Ramp: Disabling Surge Mode
To return the repository to standard CI behavior (e.g., after a release crunch or when runner capacity increases):

1.  **Update Variable:** Change `MERGE_SURGE` to `false` in GitHub Settings.
2.  **Verify PRs:** New PR commits will immediately start running the full suite. Existing PRs in the Merge Queue will continue their current runs.
3.  **Monitor Queue:** Watch the GitHub Actions queue depth. If wait times exceed 60 minutes, consider re-enabling Surge Mode.

### Re-enabling Suppressed Workflows
Some sidecar workflows were temporarily suppressed to free up slots.
*   **Golden Path Supply Chain:** Currently gated by `MERGE_SURGE`. It will automatically re-enable on PRs when the flag is `false`.
*   **CodeQL:** Gated by `MERGE_SURGE`.

### Enforcement
The branch protection for `main` is strictly enforced and monitored for drift.
*   **Last Verified:** 2026-02-10
*   **Verified By:** Gemini CLI Agent
*   **Snapshot:** `docs/ci/snapshots/branch_protection.main.json`
*   **Drift Gate:** `.github/workflows/branch-protection-drift.yml` (Runs daily and on policy changes)

### Maintenance
Platform Engineering should audit the `MERGE_SURGE` status weekly. It is intended as a tactical tool, not a permanent baseline.