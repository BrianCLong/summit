# Ops Evidence Release Runbook

This runbook describes how to generate and manage the **Ops Evidence Pack**, an optional auxiliary artifact for Summit Platform releases.

## Overview
The Ops Evidence Pack aggregates operational context (runbooks, alerts, dashboards) matching a specific release. It is **not** a supply-chain artifact and is used primarily for incident response and operational auditing.

**Owner**: Operations Team / Release Captain
**Cadence**: Recommended for every GA release and major hotfixes.

## Generating the Pack

### Method 1: Via GitHub Actions (Recommended)
1.  Navigate to **Actions** > **Generate Ops Evidence Pack**.
2.  Click **Run workflow**.
3.  Fill in the inputs:
    *   **ref**: The tag or branch you are releasing (e.g., `v1.2.0`).
    *   **upload_to_release**: Check this box if you want to attach the pack to an existing GitHub Release.
    *   **release_tag**: The exact tag name of the release (e.g., `v1.2.0`).
4.  Run the workflow.
5.  **Verification**:
    *   Check the workflow summary for the `ops-evidence-pack` artifact.
    *   If `upload_to_release` was checked, verify the file `ops-evidence-pack-v1.2.0.tar.gz` is present in the Release assets.

### Method 2: Local Generation
If CI is unavailable, you can generate the pack locally:

```bash
# Checkout the specific tag
git checkout v1.2.0

# Run the generator
./scripts/verification/generate_ops_evidence_pack.sh v1.2.0 ./dist

# The artifact will be in ./dist/ops-evidence-pack-v1.2.0.tar.gz
```

## Retention & Storage
*   **Workflow Artifacts**: Retained for 5 days (default GitHub policy).
*   **Release Assets**: Retained indefinitely with the release.
*   **Offline Storage**: If required by policy, download the tarball and store it in the designated evidence archive (e.g., S3 bucket `summit-evidence-archive/ops/`).

## Rollback / Disabling
If the generation process fails or causes issues:
1.  **Disable Workflow**: In GitHub Actions settings, disable the `generate-ops-evidence-pack.yml` workflow.
2.  **Manual Fallback**: Use the local generation method described above.
3.  **Impact**: This is a non-blocking, optional artifact. Failure to generate does **not** stop the release or invalidate supply chain guarantees.

## Troubleshooting
*   **Missing Release**: If the upload fails with "release not found", ensure the `release_tag` input matches an *existing* GitHub release. The workflow does not create releases.
*   **Permission Error**: Ensure the actor triggering the workflow has `contents: write` permissions (typically Release Captains).
