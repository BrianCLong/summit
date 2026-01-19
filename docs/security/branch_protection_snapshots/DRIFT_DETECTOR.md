# Branch Protection Drift Detector

This directory contains the operational tooling and snapshots for detecting drift in GitHub Branch Protection settings.

## Overview

We use a "Snapshot vs. Actual" approach to ensure our `main` branch protection settings (Rulesets or Classic) do not drift from the approved configuration.

- **Snapshot**: A JSON file versioned in this directory (e.g., `rulesets_main_effective_2025-01-01.json`).
- **Actual**: The live configuration fetched via the GitHub API.
- **Drift Detector**: A script `scripts/security/check_branch_protection_drift.ts` that compares them.

## Automated Checks

The check runs automatically:

- **Schedule**: Weekly (Mondays).
- **Workflow**: `.github/workflows/branch-protection-drift.yml`
- **Failure**: If drift is detected or API access fails, the workflow fails and uploads a report artifact.

## Running Locally

To run the drift check locally:

```bash
# Set your token (must have 'read:repo' or 'read:administration')
export BRANCH_PROTECTION_AUDIT_TOKEN=github_pat_...

# Run the script
npx tsx scripts/security/check_branch_protection_drift.ts
```

### Exit Codes

- `0`: No drift.
- `2`: Drift detected.
- `3`: Error / Insufficient permissions.

## Configuration & Tokens

The script requires a GitHub token to fetch live settings.

**Secret Name**: `BRANCH_PROTECTION_AUDIT_TOKEN`

**Minimal Permissions (Fine-grained PAT)**:

- **Repository access**: This repository.
- **Repository permissions**:
  - `Administration`: **Read-only** (to fetch protection rules).
  - `Metadata`: **Read-only** (default).

If the secret is not set, the workflow falls back to `GITHUB_TOKEN`, which often has insufficient permissions to read detailed branch protection settings (resulting in 403 or 404).

## Resolving Drift / Updating Snapshots

If drift is reported, you must choose one:

1.  **Revert the manual change in GitHub**: Go to Settings -> Branches and undo the unapproved change.
2.  **Accept the change (Update Snapshot)**:
    - If the change is intentional and approved, you must update the snapshot.
    - Create a new JSON snapshot reflecting the _new_ state.
    - **Do not overwrite** old snapshots; create a new dated file.
    - Commit the new snapshot to this directory.

_(Note: Tooling to auto-generate the snapshot is planned but currently manual JSON creation or using a helper script is required.)_
