# Privacy Budget

## Budget Model

- Track usage by target, tenant, and module.
- Costs computed by sensitivity and bytes returned.

```json
{
  "budget_id": "pb_...",
  "epsilon": 1.0,
  "delta": 0.000001,
  "remaining": 0.7,
  "cost_model": "bytes*sensitivity"
}
```

## Enforcement

- Decrement budget per module execution.
- Block further scans once exhausted.
- Persist budget usage in audit ledger.
