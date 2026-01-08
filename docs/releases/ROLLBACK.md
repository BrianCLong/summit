# Runbook: Rollback

## 1. Purpose

This runbook describes the process for rolling back a failed or problematic release. The primary goal is to restore the system to the last known good state as quickly and safely as possible.

## 2. Prerequisites

*   A decision to roll back has been made by the incident response team.
*   You have the version number of the last known good release (e.g., `v1.2.3`).
*   You have access and permissions to trigger the release workflow in GitHub Actions.

---

## 3. Step-by-Step Instructions

The rollback process leverages the same release workflow used for cutting new releases, but with the `channel` set to `rollback`.

### Step 3.1: Identify the Last Known Good Version

Before initiating a rollback, you must identify the exact version to which you are returning. This can be found on the **Releases** page of the GitHub repository.

*   **Last Known Good Version:** `vX.Y.Z`

### Step 3.2: Trigger the Rollback Workflow

1.  **Navigate to the [Release Governance Workflow](/.github/workflows/release-governance.yml).**
2.  **Click `Run workflow`**.
3.  **Fill in the inputs:**
    *   **`channel`**: Select `rollback`.
    *   **`target_sha`**: Enter the **tag name** of the last known good release (e.g., `v1.2.3`). The workflow will resolve this tag to the correct commit SHA.
    *   **`apply`**: Set to `true`. Rollbacks are emergency procedures and are always considered "live" runs.
4.  **Monitor the workflow:**
    *   The workflow will redeploy the specified previous version.
    *   Monitor system health dashboards and logs to ensure the application returns to a stable state.

### Step 3.3: Post-Rollback Verification

1.  **Verify Application Health:** Check monitoring and alerting systems to confirm that the issue that triggered the rollback is resolved.
2.  **Communicate Status:** The incident commander should communicate the status of the rollback to all stakeholders.
3.  **Create Post-Mortem:** A post-mortem should be initiated to investigate the root cause of the failure, as outlined in the [Incidents](incidents/README.md) runbook.

---

## 4. Expected Artifacts

*   A successful run of the `Release Governance` workflow with the `rollback` channel.
*   The system is running the last known good version of the application.

---

## 5. Failure Modes & Rerun Commands

| Failure Mode                           | Action                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Rollback workflow fails**            | This is a critical incident. Escalate immediately to the on-call SRE team. The deployment may need to be performed manually.           |
| **Rollback does not resolve the issue** | The issue may not be related to the release itself. Continue incident response procedures to identify the true root cause.          |
| **Invalid version specified**          | The workflow will fail at the preflight check. Ensure you are using a valid, existing tag for the `target_sha` input.                 |
