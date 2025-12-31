# Decision Guide: Interpreting Policy Denials

## Common Denial Reasons

- Missing scope (e.g., `data:read` not granted)
- Budget exceeded for the tenant or partner
- Rate limit exceeded
- Plugin or connector not approved for the tenant

## Remediation Steps

1. Inspect the denial entry in provenance: `policy_decisions[].explanation`.
2. Map the denial to the minimum additional scope or cap increase required.
3. Re-run with updated parameters; avoid infinite retries.

## When to Escalate

- Repeated denials for the same action despite correct scopes
- Requests to expand scopes to `policy:write` or wildcard permissions
- Cross-tenant access attempts or suspected token leakage

Escalate to governance with the provenance reference and the minimal requested change.
