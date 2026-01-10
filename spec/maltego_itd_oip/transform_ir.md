# Transform IR

## Representation

```json
{
  "plan_id": "plan_...",
  "steps": [
    {
      "id": "step_1",
      "transform": "lookup_dns",
      "inputs": ["entity:domain:example.com"],
      "outputs": ["entity:ip:1.2.3.4"],
      "source": "osint:resolver",
      "policy_decision_id": "pdt_..."
    }
  ],
  "schema_version": "2025-12-01"
}
```

## Requirements

- All steps include policy decision IDs.
- Transform signatures hashed for memoization.
- Determinism token required for macro reuse.
