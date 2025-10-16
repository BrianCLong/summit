# Multi‑Account Image Promotion

Two choices:

1. **ECR replication** (Terraform included): images pushed to dev are replicated to staging, then to prod.
2. **Manifest copy** (workflow `promote-cross-account.yml`): copies the OCI manifest between registries without pulling/pushing layers locally.

Set repository secrets:

- `AWS_REGION`
- `AWS_ROLE_ARN_DEV`, `AWS_ROLE_ARN_STAGING`, `AWS_ROLE_ARN_PROD`
- `ECR_DEV_URL`, `ECR_STAGING_URL`, `ECR_PROD_URL` (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com/summit-dev`)
