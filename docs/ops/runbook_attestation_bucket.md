# Runbook: Attestation Bucket Management

## 1. Overview
This runbook covers the operational tasks related to the artifacts bucket used for storing build attestations and provenance evidence.

## 2. Configuration
The attestation workflow is controlled by the following repository variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ATT_DEST` | Destination type (`artifact`, `s3`, `gcs`) | `s3` |
| `ATT_BUCKET` | Name of the bucket | `summit-artifacts-prod` |
| `ATT_PREFIX` | Path prefix in the bucket | `provenance` |
| `AWS_REGION` | AWS Region (if using S3) | `us-east-1` |

Secrets required for OIDC:
- `AWS_ROLE_ARN`: IAM Role ARN to assume (AWS)
- `GCP_WIF_PROVIDER`: Workload Identity Provider name (GCP)
- `GCP_SA_EMAIL`: Service Account Email (GCP)

## 3. Preflight Checklist (OIDC Setup)
Before enabling cloud upload, ensure:
1.  **Trust Policy:** The IAM role trust policy is scoped to the repository and branch.
2.  **Bucket Permissions:** The role has `s3:PutObject` (or equivalent) on the bucket and prefix.
3.  **Object Lock:** (Highly Recommended) Enable S3 Object Lock or GCS Bucket Lock in "Governance" mode for the `provenance/` prefix to prevent tampering.

## 4. Failure Modes & Diagnostics

### Artifact Upload Fails
- **Cause:** Quota exceeded or retention policy conflict.
- **Fix:** Check GitHub Actions storage usage.

### Cloud Auth Fails
- **Cause:** OIDC token mismatch or role trust policy misconfiguration.
- **Fix:** Verify `id-token: write` permission in the workflow. Check CloudTrail (AWS) or Workload Identity logs (GCP).

### Prefix Mismatch
- **Cause:** Incorrect `ATT_PREFIX` or `github.sha` usage.
- **Fix:** Ensure the workflow uses `${{ github.sha }}` for stable paths.

## 5. Rollback Procedures
To disable bucket upload and fall back to GitHub artifacts only:
1.  Set repository variable `ATT_DEST=artifact`.
2.  Re-run the failed mainline workflow.

## 6. Monitoring & KPIs
- **Completeness:** % of `main` commits with a corresponding `attestation.json` in the bucket.
- **Freshness:** Lag between merge to `main` and availability of provenance evidence.
- **Error Rate:** % of attestation generation/verification failures in CI.
