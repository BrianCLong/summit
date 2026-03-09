# Post-GA Operating Model (Day-2)

**Effective Date:** 2026-01-08
**Status:** ACTIVE
**Owner:** Release Captain (Jules)

## 1. Promotion Conveyor & Intake Cap

To maintain Golden Main stability, we enforce a strict **Weekly Intake Cap**.

*   **Cap Limit:** Maximum **5 Feature PRs** promoted to `main` per week.
*   **Priority:** Security Fixes > P0 Bugs > Feature Work > Tech Debt.
*   **Overflow:** PRs exceeding the cap are queued in the **Draft PR Backlog** for the next window.

## 2. Minimum Review & Verification Policy

All PRs must meet the **Day-2 Quality Bar**:

*   **Approvals:** 1 Human Owner (CODEOWNERS) + 1 Automated/Agent Check.
*   **CI Status:** 100% Green on `ci-core.yml`, `ga-gate.yml`, and `security-gate`.
*   **Evidence:** PR description must contain a `## Verification` section with links to artifacts (screenshots, logs, or metrics).
*   **Labels:** Must be classified (`patch`, `minor`, `major`) and risk-assessed (`risk:low`, `risk:high`).

## 3. Rebase & Conflict Policy

We operate on a **"Fresh Head"** principle:

*   **Stale Branches:** Any branch older than **5 days** must be rebased on `main` before review.
*   **Conflict Resolution:**
    *   **Simple:** Author resolves via rebase.
    *   **Complex:** If conflicts span >3 files or core logic, close and **REWRITE** as a new PR. Do not merge messy conflict resolutions.

## 4. Merge Queue Sequencing

Direct merges to `main` are **forbidden**. All changes must pass through the Merge Queue:

1.  **Happy Path:** `scripts/smart-test.cjs` passes → Enqueue.
2.  **Sequencing:** Serial execution. Failure in queue ejects the PR.
3.  **Batching:** Up to 3 compatible `chore` or `docs` PRs can be batched. Feature PRs are isolated.

## 5. No-Churn Constraints

The following changes are **auto-rejected** post-GA:

*   **Aesthetic Refactors:** Formatting changes without functional impact.
*   **Library Swaps:** changing utility libraries (e.g., `lodash` -> `underscore`) without security justification.
*   **Folder Moves:** Renaming/moving files for "organization" is banned.

## 6. Flake Management Policy

*   **Definition:** A test failing <10% of the time without code changes.
*   **3-Strike Rule:** Any test flaking 3 times in a week is **quarantined** (`.quarantine/`) or disabled.
*   **Fix SLA:** Quarantined tests must be fixed within 7 days or deleted.
