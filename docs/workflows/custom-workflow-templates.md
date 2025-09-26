# Custom Workflow Templates with Argo

This guide describes how Summit operators can define reusable ingestion and processing pipelines using Argo Workflow templates. Templates are stored in PostgreSQL and executed through GraphQL mutations so analysts can launch automations with dynamic inputs.

## Prerequisites

- Summit server configured with access to PostgreSQL migrations (`server/migrations/20250901120000-create-workflow-templates.sql`).
- Argo Workflows API available. Set the following environment variables for the server process:
  - `ARGO_WORKFLOWS_URL`: Base URL of the Argo Workflows API (e.g. `https://argo.example.com`).
  - `ARGO_WORKFLOWS_NAMESPACE`: Namespace used for submissions (defaults to `argo`).
  - `ARGO_WORKFLOWS_TOKEN`: Optional bearer token for API authentication.
- Workflow authors with a tenant context (passed via GraphQL context headers or explicit `tenantId`).

## Defining Templates

Create workflow definitions by calling the `createWorkflowTemplate` mutation. Each template stores:

- `argoTemplate`: Raw Argo `Workflow` or `WorkflowTemplate` spec represented as JSON.
- `variables`: A list of inputs that analysts can supply when they launch a run.

Example mutation:

```graphql
mutation CreateWorkflowTemplate($input: CreateWorkflowTemplateInput!) {
  createWorkflowTemplate(input: $input) {
    id
    name
    variables { name required defaultValue }
  }
}
```

Example variables payload:

```json
{
  "input": {
    "tenantId": "tenant-1",
    "name": "Data Ingestion",
    "description": "Fetches and normalizes partner data",
    "argoTemplate": {
      "metadata": { "namespace": "intelgraph" },
      "spec": {
        "entrypoint": "ingestion-pipeline",
        "templates": [
          { "name": "ingestion-pipeline", "steps": [[{ "name": "fetch", "template": "fetch" }]] },
          { "name": "fetch", "container": { "image": "ghcr.io/summit/fetcher:latest" } }
        ]
      }
    },
    "variables": [
      { "name": "sourceUrl", "required": true },
      { "name": "outputBucket", "required": true },
      { "name": "batchSize", "defaultValue": 500 }
    ]
  }
}
```

The mutation persists the template in PostgreSQL and returns the saved record. Templates can later be retrieved via the `workflowTemplates` query for validation or catalog purposes.

## Executing Templates

Launch workflows with the `executeWorkflowTemplate` mutation. Provide the stored template ID and any variables required by the definition. The resolver validates required variables, applies default values, and submits the workflow to Argo with merged parameters.

```graphql
mutation ExecuteWorkflowTemplate($input: ExecuteWorkflowTemplateInput!) {
  executeWorkflowTemplate(input: $input) {
    runId
    status
    submittedAt
  }
}
```

Example payload:

```json
{
  "input": {
    "templateId": "<template-uuid>",
    "tenantId": "tenant-1",
    "runName": "partner-daily",
    "variables": {
      "sourceUrl": "s3://partner/daily.json",
      "outputBucket": "s3://summit-normalized",
      "batchSize": 1000
    }
  }
}
```

If `ARGO_WORKFLOWS_URL` is not set the resolver returns a `DRY_RUN` response so developers can test GraphQL flows locally without hitting Argo.

## Sample Templates

The repository includes reusable Argo YAML definitions under `workflows/templates/`.

- [`custom-data-ingestion.yaml`](../../workflows/templates/custom-data-ingestion.yaml): Demonstrates a fetch → normalize → publish pipeline with parameter substitution for the source URL, output bucket, and batch size.

Use these YAML files as starting points—load them, convert to JSON, and pass as the `argoTemplate` payload when creating templates.

## Testing

Jest tests in `server/__tests__/workflowTemplates.test.ts` cover repository mapping logic and the Argo submission service. Run them with:

```bash
cd server
npm test -- workflowTemplates.test.ts
```

The dry-run mode makes the tests deterministic even without an Argo cluster.
