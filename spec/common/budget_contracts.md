# Budget Contracts

**Purpose:** Encode performance and privacy budgets that bound resource usage and ensure
safe-by-default execution.

## Contract Fields

```json
{
  "contract_id": "bud_...",
  "p95_latency_ms": 1200,
  "max_expansions": 250,
  "max_egress_bytes": 750000,
  "rate_limits": {
    "per_minute": 60,
    "per_target": 5
  },
  "privacy_budget": {
    "epsilon": 1.0,
    "delta": 0.000001
  },
  "valid_for": "PT30M"
}
```

## Enforcement Rules

- Terminate execution if `max_expansions` or `max_egress_bytes` is exceeded.
- Apply exponential backoff when rate limits are reached.
- For privacy budgets, decrement on each query and block when exhausted.

## Auditability

- Persist budget contract in witness chain and evidence bundle metadata.
- Expose budget usage metrics to observability pipeline.
