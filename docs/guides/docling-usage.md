# Docling Usage Guide

Docling translates build/test artifacts into actionable intelligence. This guide shows how to access the service via GraphQL and HTTP.

## GraphQL Mutations

### Summarize Build Failure

```graphql
mutation Summarize($input: SummarizeBuildFailureInput!) {
  summarizeBuildFailure(input: $input) {
    summary {
      text
      highlights
    }
    findings {
      label
      value
      confidence
    }
  }
}
```

- `purpose`: `investigation` recommended.
- `retention`: `SHORT` for transient build logs.

### Extract Licenses

```graphql
mutation Extract($input: ExtractLicensesInput!) {
  extractLicenses(input: $input) {
    findings {
      label
      value
      severity
    }
    policySignals {
      classification
      value
      retention
    }
  }
}
```

- Provide SBOM text or SPDX JSON string.
- Policy signals map to retention tiers enforced via OPA.

### Generate Release Notes

```graphql
mutation Notes($input: ReleaseNotesInput!) {
  generateReleaseNotes(input: $input) {
    summary {
      text
      highlights
    }
  }
}
```

- Diff text should include commit headers + bullet descriptions.

## HTTP Endpoints

| Endpoint             | Description                                     | Notes                                                         |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `POST /v1/parse`     | Parse binary/text artifacts                     | Base64 encode payload.                                        |
| `POST /v1/summarize` | Summaries for logs, changelogs, compliance docs | Requires `focus` (`failures`, `changelog`, `compliance`).     |
| `POST /v1/extract`   | License/owner/version extraction                | Targets array subset of `license`, `version`, `cve`, `owner`. |

All requests must include:

```json
{
  "requestId": "<uuid>",
  "tenantId": "<tenant>",
  "purpose": "investigation",
  "retention": "short"
}
```

Responses include `provenance`, `usage`, and `policySignals`. Capture `usage.costUsd` to feed TenantCostService.

## Pipelines

- `DoclingBuildPipeline.execute` wires `summarizeBuildFailure`, `extractLicenses`, and `generateReleaseNotes`.
- Integrate into Maestro by adding a pipeline node: `type: "docling"` with parameters `artifactRefs` and `retention`.

## Observability

- Prometheus metrics: `docling_inference_duration_seconds`, `docling_inference_total`, `docling_cost_usd`.
- Grafana dashboard: `Docling Overview`.
- Provenance ledger table: `provenance_ledger_v2` (filter `action_type LIKE 'docling%'`).

## Testing

- Unit & integration: `npm run test -- docling`
- Golden fixtures: `services/docling-svc/tests/fixtures`
- Load: `k6 run tests/load/docling-load.js`
