# Cost Model & Governance

## Overview
Summit employs a multi-dimensional cost governance model designed to attribute, forecast, and control resource consumption across the platform. This model ensures that all operational costs are transparently linked to business value (Tenants, Agents) and that runaway consumption is prevented via hard-stop budgets.

## Attribution Model

Every resource consumption event is attributed to three dimensions:

1.  **Tenant**: The top-level customer or organizational unit.
2.  **Capability (Domain)**: The functional area (e.g., `AGENT_RUNS`, `PREDICTIVE`, `STORAGE`).
3.  **Agent/Source**: The specific actor (e.g., `PlannerAgent-v4`, `User-123`).

### Metrics
We track the following consumable metrics:
*   **Tokens**: LLM input/output tokens.
*   **Requests**: API hits.
*   **Compute Time**: Execution duration for heavy jobs.
*   **Storage**: Database and vector store usage (GB-Months).

## Budgeting & Enforcement

Budgets are defined per Tenant and Domain.

### Policy Levels
1.  **Soft Cap (Alerting)**:
    *   Triggered at 50%, 80%, and 100% of budget.
    *   Action: Emits `budget_threshold_reached` event. Operations continue.
2.  **Hard Stop (Enforcement)**:
    *   Triggered at > 100% of budget.
    *   Action: Rejects new requests with `402 Payment Required` or `403 Forbidden`.
    *   Configurable via `hardStop: boolean` flag.

### Configuration
Budgets are configured via the `BudgetTracker` API or Admin Console.

```typescript
interface BudgetConfig {
  domain: CostDomain;
  limit: number;      // e.g. 1000.00
  currency: string;   // 'USD'
  period: 'monthly';
  hardStop: true;     // Reject requests over limit
}
```

## Forecasting
Simple linear extrapolation is used to predict end-of-period spend based on current burn rate. This drives early warning alerts (e.g., "Projected to exceed budget in 5 days").

## Cost Domains

| Domain | Description | Unit |
| :--- | :--- | :--- |
| `agent_runs` | Execution of Maestro agents | Tokens + Compute |
| `coordination` | ChatOps and Consensus | Messages |
| `evaluation` | Automated QA/Eval runs | Tokens |
| `marketplace` | 3rd party plugin usage | Credits |
| `write_actions` | Side-effect operations | Count |

## Best Practices
*   **Sandboxing**: Set low hard-stop budgets for experimental Agents.
*   **Rate Limiting**: Use concurrency caps (`BackpressureController`) alongside cost budgets to prevent rapid budget exhaustion (DoS).
*   **Optimization**: Review the `OptimizationSuggestions` report to identify inefficient agents.
