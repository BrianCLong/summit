# Cost Metrics Contract v1.0

## Overview
This contract defines the standardized format for all cost-related events and ledger entries across the Summit Platform. This ensures uniform attribution to Tenants, Agents, and Operations.

## Event Schema (JSON)

```json
{
  "eventId": "uuid-v4",
  "timestamp": "ISO-8601",
  "tenantId": "string",
  "agent": {
    "id": "string",
    "version": "semver",
    "correlationId": "uuid-v4"
  },
  "operation": {
    "type": "LLM_COMPLETION | VECTOR_SEARCH | DB_QUERY | API_CALL",
    "name": "string",
    "provider": "string",
    "model": "string (optional)"
  },
  "metrics": {
    "costUSD": 0.0000,
    "units": "tokens | requests | ms | bytes",
    "quantity": 0,
    "isEstimated": boolean
  },
  "context": {
    "requestId": "string",
    "userId": "string (optional)",
    "environment": "production | staging | ci"
  }
}
```

## Attribution Rules

1.  **Mandatory Tenant ID**: Every cost event MUST include a valid `tenantId`.
2.  **Agent Identity**: If the operation is triggered by an autonomous agent, `agent.id` and `agent.version` are mandatory.
3.  **Correlation ID**: All events in a single agent thought/action cycle must share the same `correlationId`.

## Precision Requirements

- **USD Values**: Must be tracked to at least 4 decimal places ($0.0001).
- **Time**: Latency-based costs must use milliseconds.
- **Tokens**: Must separate Input and Output tokens in the `context` or a more detailed `metrics` sub-object if precision is required.

## Backend Integration Points

### 1. Postgres (Budget Ledger)
Table `budget_ledger` will be the primary source of truth for these events.
- **Table Name**: `budget_ledger`
- **Retention**: 90 days (standard), 365 days (audit-grade).

### 2. Prometheus / Grafana
- **Namespace**: `summit_cost`
- **Labels**: `tenant_id`, `agent_id`, `operation_type`.

## Enforcement Tiers

| Tier | Utilization | Action |
| :--- | :--- | :--- |
| **Normal** | < 80% | Log & Record |
| **Warning** | 80% - 99% | Emit `COST_WARNING` webhook, inject warning into Agent context |
| **Critical** | >= 100% | Reject operation, emit `BUDGET_EXCEEDED` event |
