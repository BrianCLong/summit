# OIDC Migration Guide

## Overview
We have migrated from using static IAM User credentials (long-lived access keys) to **OpenID Connect (OIDC)** for GitHub Actions. This improves security by using short-lived tokens generated only during workflow runs.

## New Trust Policy
The IAM Role `summit-ci-oidc` trusts the GitHub OIDC provider `token.actions.githubusercontent.com`.
The trust is scoped to:
- **Repo:** `BrianCLong/summit`
- **Branch:** `refs/heads/main` and `refs/tags/*`
- **Audience:** `sts.amazonaws.com`

See `docs/ci/oidc-trust.json` for the exact policy.

## Usage in Workflows
Workflows must request the `id-token: write` permission.

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/summit-ci-oidc
      aws-region: us-east-1
```
