# CI/CD Workflows

This directory contains the GitHub Actions workflows for the Summit/IntelGraph repository.

## Release Process

The GA (General Availability) release process is a multi-phase, policy-driven operation designed for safety, auditability, and manual approval. It is orchestrated by three core workflows:

1.  `release-governance.yml`
2.  `release-cut.yml`
3.  `post-release-verify.yml`

### How to Execute a GA Release

**Phase 1: Pre-cut Validation (Eligibility Check)**

1.  Navigate to **Actions -> Release Governance**.
2.  Click **Run workflow**.
3.  Enter the full **commit SHA** you want to release in the `target` field.
4.  Leave `apply` as `false`.
5.  Run the workflow and wait for it to complete.
6.  Verify that the run produced an artifact named `evidence-bundle-<sha>`.
7.  Inside the bundle, confirm that `decision.json` shows `"decision": "ELIGIBLE"`.
8.  **Record the workflow run ID**. You will need it for the next step.

**Phase 2: War Room & Approval**

1.  Generate the War Room checklist by running the `generate-war-room-checklist.mjs` script.
2.  Convene the release team and complete the checklist.
3.  If all preconditions are met, proceed to the approval gate.

**Phase 3: The Cut (Applying the GA Tag)**

1.  Navigate to **Actions -> Release Cut**.
2.  Click **Run workflow**.
3.  Enter the same **commit SHA** in the `sha` field.
4.  Enter the **workflow run ID** from the `release-governance` run in the `governance_run_id` field. This links the cut to its eligibility evidence.
5.  Set `apply` to `true`.
6.  Run the workflow. It will pause and wait for approval.
7.  An authorized reviewer must approve the run from the "Environments" tab or the workflow run UI.

**Phase 4 & 5: Automated Verification**

*   Once approved, the `release-cut` workflow creates and pushes the `ga-<date>-<shortsha>` tag.
*   The push of this tag automatically triggers the `post-release-verify.yml` workflow.
*   Monitor this workflow to ensure the smoke tests pass.
*   If it fails, an incident report is generated, and the rollback plan should be activated.

**Phase 6: Completion**

*   If the post-release verification passes, run the `generate-release-summary.mjs` script to create the final `RELEASE_COMPLETE` artifact.
*   The release is now complete.

### Workflow Details

#### `release-governance.yml`

*   **Trigger**: `workflow_dispatch`
*   **Purpose**: Performs security, policy, and readiness checks on a given commit SHA.
*   **WARNING**: As of the initial implementation, the underlying script (`scripts/release/check-eligibility.mjs`) is a **placeholder**. It does **not** perform real checks and will always return an `ELIGIBLE` decision. This framework must be integrated with actual security and policy scanners before being used in production.
*   **Inputs**:
    *   `channel`: The release channel (e.g., `ga`).
    *   `target`: The commit SHA to evaluate.
    *   `apply`: Should always be `false`.
*   **Outputs**: An evidence bundle artifact containing `decision.json`.

#### `release-cut.yml`

*   **Trigger**: `workflow_dispatch`
*   **Purpose**: Creates and pushes the official GA tag after receiving manual approval.
*   **Inputs**:
    *   `channel`: Must be `ga`.
    *   `sha`: The commit SHA to tag.
    *   `governance_run_id`: The run ID of the `release-governance` workflow that deemed the SHA eligible.
    *   `apply`: Must be `true` to execute the cut.
*   **Protection**: Uses the `release-approval` environment, requiring a manual sign-off.

#### `post-release-verify.yml`

*   **Trigger**: `push` of a tag matching `ga-*`
*   **Purpose**: Runs the "golden path" smoke tests (`make smoke`) to validate the release.
*   **Outputs**:
    *   On success: A `post-release-evidence.json` artifact.
    *   On failure: An `incident-report.md` artifact.
