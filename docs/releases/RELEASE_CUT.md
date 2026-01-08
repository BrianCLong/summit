# Release Cut Process

This document describes the process for cutting a release candidate (RC) or general availability (GA) release using the "Release Cut" workflow.

## Overview

The release process is governed by a **Two-Phase Commit** model:
1.  **Plan**: Generates a release plan and verifies eligibility.
2.  **Apply**: Executes the release (tagging/branching), requiring explicit human approval.

## Workflow

The workflow is defined in `.github/workflows/release-cut.yml`.

### Inputs

*   **SHA**: The commit SHA to be released.
*   **Channel**: `rc` (Release Candidate) or `ga` (General Availability).
*   **Apply**: Boolean. If `true`, the release will proceed to the approval stage if eligible.

### Phases

#### 1. Plan Phase
*   **Trigger**: Manual dispatch.
*   **Action**:
    *   Checks out the specified SHA.
    *   Runs eligibility checks (e.g., evidence bundle verification).
    *   Generates a `release-plan` artifact containing the release details and eligibility status.
*   **Outcome**:
    *   If eligible: The workflow proceeds (or waits, depending on the `apply` input).
    *   If ineligible: The workflow fails immediately.

#### 2. Apply Phase (Approval Gate)
*   **Requirement**: `Plan` phase passed AND `Apply` input is `true`.
*   **Environment**: `release-approval`.
    *   **Gate**: This environment **must** be configured with "Required Reviewers" in GitHub Settings.
    *   **Action**: The workflow pauses until an authorized reviewer approves the deployment to this environment.
*   **Execution**:
    *   Verifies the SHA and Channel match the approved plan.
    *   Checks if the target tag already exists (fails if it does).
    *   Creates and pushes the git tag (e.g., `v1.0.0-rc...` or `ga/v1.0.0`).
    *   Generates an audit log.

## Configuration

To enable the approval gate:

1.  Go to **Settings** > **Environments**.
2.  Create an environment named `release-approval`.
3.  Enable **Required Reviewers**.
4.  Add the specific users or teams authorized to cut releases.

## Audit

Every release cut produces an audit trail:
1.  **Job Summary**: The GitHub Actions run summary includes the "Release Audit Log".
2.  **Artifact**: A `release-audit` artifact (`result.md`) is uploaded, containing:
    *   Actor (who triggered the workflow)
    *   Timestamp
    *   SHA
    *   Created Reference (Tag)
    *   Channel

## Dry Run

To perform a dry run (check eligibility without releasing):
1.  Trigger the "Release Cut" workflow.
2.  Set `Apply` to `false`.
3.  Review the `Plan` job output and the `release-plan` artifact.
