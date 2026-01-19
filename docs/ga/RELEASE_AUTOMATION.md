# Secure release automation (environments & gated promotions)

**Goal:** promotions (dev→stage→prod) require approvals, wait timers, and env‑scoped secrets—separate from merge rules.

## Deploy Workflow

The deploy workflow is located in `.github/workflows/deploy.yml`.

In Settings → Environments, ensure you create **dev**, **stage**, **prod** with:
* **Required reviewers** (e.g., Release Captain + Security)
* **Wait timer** (e.g., 10–30 min guardrail)
* **Env‑scoped secrets** only for that environment

## Required Status Check

* **GA Cloud Readiness**: This status check must pass before merging or deploying to production.
  * Driven by `scripts/ga/cloud-readiness.mjs`
  * Runs hourly via `.github/workflows/ga-cloud-readiness.yml`

## Replace cloud secrets with OpenID Connect (OIDC)

**Why:** no long‑lived keys in repo or Actions; jobs get short‑lived, auto‑rotated credentials at runtime.

### AWS (GitHub → AWS via OIDC)

1. In AWS IAM, create an **OIDC identity provider** for `token.actions.githubusercontent.com` and a role with trust policy that restricts to your org/repo and (optionally) environment:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:environment:prod"
      }
    }
  }]
}
```

2. In your workflow:

```yaml
permissions: { id-token: write, contents: read }
steps:
  - uses: actions/checkout@v4
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/gh-oidc-prod
      aws-region: us-east-1
  - run: aws sts get-caller-identity
```

### Azure (GitHub → Azure Federated Credentials)

* Create an App Registration; add **Federated credential** with issuer `https://token.actions.githubusercontent.com`, and subject like `repo:YOUR_ORG/YOUR_REPO:environment:prod`.

```yaml
permissions: { id-token: write, contents: read }
steps:
  - uses: actions/checkout@v4
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      enable-AzPSSession: true
  - run: az account show
```

*(Client ID/Tenant/Subscription IDs are safe to store as env‑scoped secrets; no client secret needed when using federated creds.)*

### GCP (Workload Identity Federation)

1. Create a **Workload Identity Pool + Provider**, map `attribute.repository` to `YOUR_ORG/YOUR_REPO` and (optional) `attribute.environment`.

2. Grant the service account **Workload Identity User** to your provider.

```yaml
permissions: { id-token: write, contents: read }
steps:
  - uses: actions/checkout@v4
  - id: auth
    uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: projects/123456/locations/global/workloadIdentityPools/gh/providers/github
      service_account: deployer@your-project.iam.gserviceaccount.com
  - run: gcloud auth list
```
