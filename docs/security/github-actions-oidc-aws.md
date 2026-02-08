# GitHub Actions OIDC with AWS STS (least-privilege trust)

This guide codifies the Summit default for brokering short‑lived AWS credentials from GitHub
Actions via OpenID Connect (OIDC). It replaces long‑lived credentials with a tight, claim‑scoped
trust boundary and enforces the *Law of Consistency* by aligning with the Summit Readiness
Assertion. See `docs/SUMMIT_READINESS_ASSERTION.md`. 

## Why this is the default

- **No long‑lived secrets**: GitHub issues an OIDC token on demand; AWS STS validates and
  exchanges it for temporary credentials.
- **Narrow trust boundary**: IAM trust policies bind access to repo, branch, and (optionally)
  GitHub Environments.
- **Least privilege**: Runtime job permissions are restricted to `id-token: write`.

## AWS setup (identity provider + role trust policy)

1. **Create the OIDC provider** in AWS IAM with:
   - **Provider URL**: `https://token.actions.githubusercontent.com`
   - **Audience**: `sts.amazonaws.com`
2. **Create/Update the role trust policy** to strictly gate claims.

**Example trust policy (branch-scoped):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:ORG/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**Environment-scoped trust (recommended for production):**

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:ORG/REPO:environment:production"
    }
  }
}
```

> Governed Exception: If a legacy pipeline cannot use environments, document a temporary
> exception with expiry and rollback in the Decision Ledger.

## GitHub Actions configuration

Minimal job permissions and a pinned credentials action are required.

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@<PINNED_SHA>
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>
          aws-region: us-east-1
```

## Hardening checklist

- **Claim scoping**: Require `aud` + `sub` matching a specific repo and branch or environment.
- **Protected environments**: Require approvals and restrict which branches/tags can deploy.
- **Pinned actions**: Pin `aws-actions/configure-aws-credentials` to a commit SHA.
- **No wildcard trust**: Avoid `StringLike` wildcards unless explicitly justified.
- **Audit**: CloudTrail for `AssumeRoleWithWebIdentity` and GitHub audit logs.

## MAESTRO security alignment

- **MAESTRO Layers**: Foundation, Data, Tools, Infra, Observability, Security.
- **Threats Considered**: token replay, compromised runner, rogue workflow, supply chain action
  drift, mis-scoped trust policy.
- **Mitigations**: short‑lived credentials, strict claim filters, environment protections,
  pinned actions, CloudTrail monitoring.

## Operational signals (what to monitor)

- Unusual spikes in `AssumeRoleWithWebIdentity`.
- Tokens issued from unexpected branches or environments.
- Drift in role trust policy conditions.

## Verification guidance

- Use a dry‑run workflow in a non‑production environment to validate claim matching.
- Confirm that **forked PRs cannot assume the role**.

## References

- GitHub Actions OIDC (AWS): https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS Credentials Action: https://github.com/aws-actions/configure-aws-credentials
