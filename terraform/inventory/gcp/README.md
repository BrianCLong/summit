# GCP Workload Identity (Inventory Read-Only)

This guide sets up a GitHub OIDC → GCP Workload Identity Federation binding, so the inventory workflow can list projects.

## Steps (one-time, run as org/project admin)

1) Create a Service Account with read-only project viewer role

```bash
PROJECT_ID=<your_project_id>
gcloud iam service-accounts create inventory-sa \
  --project "$PROJECT_ID" --display-name "Inventory SA"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:inventory-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role "roles/viewer"
```

2) Create a Workload Identity Pool + Provider for GitHub Actions

```bash
POOL_ID=gh-pool
PROVIDER_ID=github
ORG=<your_github_org>
REPO=<your_repo> # or "*" to allow all repos in org

# Pool
gcloud iam workload-identity-pools create "$POOL_ID" \
  --location=global --display-name "GitHub OIDC Pool"

# Provider
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --location=global --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

3) Allow identities from the provider to impersonate the SA

```bash
PRINCIPAL="principalSet://iam.googleapis.com/projects/\$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$ORG/$REPO"
SA="inventory-sa@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="$PRINCIPAL"
```

4) GitHub Actions auth step (in inventory.yml)

```yaml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WIP }} # full resource name
    service_account: inventory-sa@${{ secrets.GCP_PROJECT }}.iam.gserviceaccount.com
- run: gcloud projects list --format='table(PROJECT_ID, NAME, PROJECT_NUMBER)'
```

Refer to Google docs for WIF details.

