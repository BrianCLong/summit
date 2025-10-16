# Multi‑Account ECR + OIDC + Replication (Terraform)

**Generated:** 2025-09-11 07:38:46Z UTC

- Creates ECR repos in three accounts (dev/staging/prod)
- Configures GitHub OIDC roles in each account for CI
- (Optional) Sets up **cross‑account replication**: dev→staging, staging→prod

> Supply `*_role_arn` to let Terraform assume into each account (via SSO/bootstrap).

**Outputs** → add to GitHub Actions repository secrets:

- `AWS_ROLE_ARN_DEV`, `AWS_ROLE_ARN_STAGING`, `AWS_ROLE_ARN_PROD`
- `ECR_DEV_URL`, `ECR_STAGING_URL`, `ECR_PROD_URL`
