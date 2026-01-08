# Runbook: Release Cut

## 1. Purpose

This runbook provides the steps for cutting a new release candidate (RC) or General Availability (GA) release. It covers both the recommended dry-run process and the final live release cut. The primary entrypoint for this process is the CI workflow.

## 2. Prerequisites

*   The target commit has passed all checks in the [GA Verification](GA_VERIFY.md) runbook.
*   You have "write" or "maintain" permissions for the repository to trigger the release workflow.
*   For a GA release, a formal sign-off has been completed and approved as per the [Sign-off Runbook](SIGNOFF.md).

---

## 3. Step-by-Step Instructions

The release process is executed via a `workflow_dispatch` trigger in GitHub Actions. This ensures a consistent, auditable, and repeatable process.

### Step 3.1: Dry-Run (Recommended)

A dry-run simulates the entire release process, including artifact generation and evidence bundle creation, without publishing anything. **This should always be done before a live release.**

1.  **Navigate to the [Release Governance Workflow](../../.github/workflows/release-governance.yml).**
2.  **Click `Run workflow`**.
3.  **Fill in the inputs:**
    *   **`channel`**: Select `rc` or `ga`.
    *   **`target_sha`**: Enter the full commit SHA of the `main` branch to be released.
    *   **`apply`**: Ensure this is set to `false`.
4.  **Monitor the workflow:**
    *   Verify that all jobs complete successfully.
    *   Download and inspect the `evidence-bundle.tar.gz` artifact from the workflow summary.

### Step 3.2: Live Release Cut (GA or RC)

This process will create and publish the release.

1.  **Navigate to the [Release Governance Workflow](../../.github/workflows/release-governance.yml).**
2.  **Click `Run workflow`**.
3.  **Fill in the inputs:**
    *   **`channel`**: Select `rc` or `ga`.
    *   **`target_sha`**: Enter the approved commit SHA.
    *   **`apply`**: Set to `true`. This action is protected and may require an approval to run.
4.  **Monitor the workflow:**
    *   Once the workflow completes, navigate to the **Releases** page in the GitHub repository.
    *   Confirm that a new release has been created with the correct tag and that all expected assets are attached.

---

## 4. Expected Artifacts

*   **Dry-Run:**
    *   An `evidence-bundle.tar.gz` artifact uploaded to the workflow summary page.
*   **Live Release:**
    *   A new GitHub Release created on the repository's **Releases** page.
    *   Release assets (e.g., `summit-server.tar.gz`, `summit-webapp.tar.gz`) attached to the GitHub Release.
    *   The `evidence-bundle.tar.gz` attached to the GitHub Release.

---

## 5. Failure Modes & Rerun Commands

| Failure Mode                        | Action / Rerun Command                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Workflow fails on a build step**  | Check the logs for the specific error. Run the build locally (`pnpm build`) to reproduce.                               |
| **Workflow fails on a test step**   | Check the logs for failing tests. Run the tests locally (e.g., `pnpm test:server`) to debug.                           |
| **Artifact signing/upload fails**   | This may be a transient network issue or a credentials problem. The job can often be re-run directly from the UI.       |
| **Release already exists**          | This is expected if re-running a job for a tag that already exists. The workflow will update the existing release.      |
| **Release fails due to freeze window** | Wait for the freeze window to close, or get authorization to re-run with the `override_freeze` input set to `true`. |
