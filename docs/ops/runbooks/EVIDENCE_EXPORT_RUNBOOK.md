# Evidence Export Runbook

This runbook details the process for exporting evidence bundles to external storage for long-term retention.

## Purpose

The evidence export workflow exists to counteract the artifact retention limits on platforms like GitHub Actions. By exporting the evidence bundles to a secure, long-term storage solution, we ensure that audit and compliance data remains accessible beyond the standard 90-day window.

## How to Run the Export Workflow

The export workflow is a manual process that can be triggered from the GitHub Actions UI.

1.  Navigate to the "Actions" tab of the repository.
2.  Select the "Export Ops Evidence" workflow from the list of workflows.
3.  Click the "Run workflow" dropdown.
4.  Fill in the required inputs:
    - `run_id`: The ID of the workflow run that generated the evidence artifact.
    - `artifact_name`: The name of the artifact to export (defaults to `evidence-bundle`).
    - `destination_uri`: The S3 URI where the artifact should be exported (e.g., `s3://my-bucket/evidence/`). **Note:** This is a prefix; the artifact's filename will be appended to it.
    - `overwrite`: (Optional, default: `false`) If set to `true`, the workflow will overwrite an existing artifact at the destination. If `false`, the workflow will fail if the artifact already exists.
    - `checksum_verify`: (Optional, default: `true`) If set to `true`, the workflow will calculate and verify the artifact's SHA256 checksum before exporting. The checksum will be included in the export receipt.
5.  Click "Run workflow".

## Required Environment Protections

To ensure the security of the export process, the following protections are in place:

- **Protected Environment:** The workflow uses a protected environment named `ops-evidence-export`, which is configured with the necessary AWS credentials as secrets.
- **Access Control:** Only authorized users and teams can trigger the workflow and approve deployments to the protected environment.

## How to Verify the Export

After the workflow completes, you can verify the export by:

1.  **Downloading the Export Receipt:** A workflow artifact named `EXPORT_RECEIPT` will be available for download. This JSON file contains the SHA256 checksum of the exported artifact.
2.  **Comparing Checksums:** Compare the checksum from the receipt with the checksum of the artifact in the S3 bucket to ensure they match.

## Rollback Plan

In the event of a security concern or workflow malfunction:

1.  **Disable the Workflow:** The "Export Ops Evidence" workflow can be temporarily disabled in the repository's Actions settings.
2.  **Rotate Credentials:** If the AWS credentials are suspected to be compromised, they should be immediately rotated in the `ops-evidence-export` environment.
