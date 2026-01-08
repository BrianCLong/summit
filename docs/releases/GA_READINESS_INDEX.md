# GA Readiness Index

This document is the single source of truth for Summit Platform General Availability (GA) readiness. It provides a complete overview of the policies, processes, and evidence required to ship a GA release.

## Current Status: Release Eligibility

A release is considered **ELIGIBLE** for GA when it meets the following criteria, verified by automated gates and manual sign-off:

1.  **Green CI Contract:** All mandatory CI checks on the target commit (`main` branch) are passing.
2.  **Zero-Drift Governance:** The release artifacts and documentation are in sync with the codebase (`pnpm verify:living-documents`).
3.  **No Open Blockers:** There are no `P0` or `P1` issues, security exceptions, or release waivers that have not been formally addressed and approved.
4.  **Successful Dry-Run:** A `workflow_dispatch` dry-run of the release pipeline has completed successfully, producing a valid evidence bundle.
5.  **Formal Sign-off:** The `SIGNOFF.md` checklist has been completed and approved by the required stakeholders.

---

## 📚 Runbooks & Playbooks

These runbooks provide step-by-step instructions for each phase of the release lifecycle.

*   **[GA_VERIFY.md](GA_VERIFY.md):** How to verify code, system health, and compliance.
*   **[RELEASE_CUT.md](RELEASE_CUT.md):** How to perform a dry-run and cut a new release.
*   **[SIGNOFF.md](SIGNOFF.md):** The formal checklist for GA eligibility and approval.
*   **[ROLLBACK.md](ROLLBACK.md):** How to roll back a failed or problematic release.
*   **[WAR_ROOM.md](WAR_ROOM.md):** The script and agenda for the go/no-go release meeting.
*   **[incidents/README.md](incidents/README.md):** How to respond to and manage incidents during a release.

---

## 🚀 How to Run the GA Pipeline

This process is designed to be deterministic and auditable, with a clear separation between dry-runs and live releases.

### One-Click CI (Preferred)

The canonical way to execute the release pipeline is via the `workflow_dispatch` trigger in GitHub Actions. This is the **only** method for a final GA cut.

1.  **Navigate to the [Release Governance Workflow](../../.github/workflows/release-governance.yml).**
2.  **Click `Run workflow`**.
3.  **Fill in the inputs:**
    *   **`channel`**: Select `rc` for a release candidate or `ga` for a final GA.
    *   **`target_sha`**: The full commit SHA to be released.
    *   **`apply`**:
        *   `false` (default): Runs a **dry-run**. This builds all artifacts and generates an evidence bundle for review without publishing.
        *   `true`: Executes a **live release**, publishing artifacts and creating a GitHub release. **Requires approval.**
4.  **Monitor the workflow:** A successful run will produce an `evidence-bundle.tar.gz` artifact and a detailed job summary.
