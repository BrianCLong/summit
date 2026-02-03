# Runbook: Attestation Bucket Management

## Configuration
The following repository variables control the upload process:
- `ATT_BUCKET`: The name of the S3/GCS bucket.
- `ATT_PREFIX`: The prefix path (default: `provenance`).

## OIDC Setup
Ensure the GitHub Actions runner has a role assigned that can write to the bucket path.

Example Trust Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::...:oidc-provider/token.actions.githubusercontent.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": { "StringLike": { "token.actions.githubusercontent.com:sub": "repo:BrianCLong/summit:*" } }
    }
  ]
}
```

## Failure Diagnostics
If the upload fails:
1. Check if `id-token: write` permission is set in the workflow.
2. Verify the bucket name is correct in repository variables.
3. Check the IAM policy for the role used by the runner.
