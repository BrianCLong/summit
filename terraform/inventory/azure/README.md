# Azure Federated Credentials (Inventory Read-Only)

Objective: Allow GitHub Actions to authenticate with a Service Principal (App Registration) using federated credentials and list subscriptions (Reader).

## Steps (one-time)

1) Create an App Registration + Service Principal

```bash
az ad app create --display-name "inventory-gha" --query appId -o tsv
APP_ID=<output_appId>
SP_ID=$(az ad sp create --id $APP_ID --query id -o tsv)
```

2) Assign Reader role at the tenant/subscription as needed

```bash
SUB_ID=$(az account show --query id -o tsv)
az role assignment create --assignee-object-id "$SP_ID" --role Reader --scope "/subscriptions/$SUB_ID"
```

3) Add federated credentials for GitHub OIDC

```bash
ORG=<your_org>
REPO=<your_repo>
SUBJECT="repo:$ORG/$REPO:ref:refs/heads/main"

az ad app federated-credential create --id $APP_ID --parameters @- << JSON
{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "$SUBJECT",
  "audiences": ["api://AzureADTokenExchange"]
}
JSON
```

4) GitHub Actions login step

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
- run: az account list --output table
```

Refer to Microsoft Learn for federated credentials and Reader role.

