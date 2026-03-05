# Infrastructure Policies

| Type | Description |
| ---- | ----------- |
| `deny-by-default` | All infrastructure provisions are explicitly denied unless specifically allowed by naming/tagging rules. |
| `owner-required` | All infrastructure metadata must include an `owner.team` attribute. |

## Profiles

- `baseline`: Basic naming and tagging enforcement.
- `restricted`: Additional guardrails for compliance (e.g., isolation, cost limits).
