# Query Cost Preview & SLO Alerts

This document explains how to use the GraphQL cost preview endpoint and the associated SLO alerts added in this sprint.

## Cost Preview API

- Endpoint: `POST /api/graphql/cost-preview`
- Body: `{ "operation": "<GraphQL query or mutation string>" }`
- Response:
  - `depth`: estimated maximum field nesting depth
  - `fieldCount`: approximate number of fields
  - `estExecutionMs`: heuristic execution time in milliseconds
  - `estCostUSD`: heuristic cost
  - `budgetSuggestion`: suggested time/cost budget and notes

Example:

```
curl -s -X POST http://localhost:4000/api/graphql/cost-preview \
  -H 'Content-Type: application/json' \
  -d '{"operation":"query { me { id name } }"}' | jq
```

## Client Integration

- Dev panel: enable with `VITE_COST_PREVIEW=1` to show a cost preview editor.
- OSINT Studio: added “Estimate Budget” next to Search button.
- Copilot Run panel: added “Estimate Budget” next to Run button.

## SLO / Alerting Rules

Rules are included under `charts/monitoring/rules/query-cost-guard.yaml` and picked up via the monitoring chart.

- `HighGraphQLLatencyP95` (warning):
  - p95 of `/graphql` latency > 500ms for 10 minutes.
  - Indicates expensive queries or server load. Use cost preview and query tuning.

- `QueryCostGuardBudgetExceeded` (critical):
  - Fires when policy evaluation errors or provenance verification failures increase over 15 minutes.
  - Signals governance/policy or supply‑chain integrity regressions.

> Tune thresholds in the rules file as operating thresholds are validated in staging.
