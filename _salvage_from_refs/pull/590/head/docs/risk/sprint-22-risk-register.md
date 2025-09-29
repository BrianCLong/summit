# Sprint 22 Risk Register

| Threat | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| SKU misuse to probe rare buckets | Medium | High | k>=25, suppression, epsilon caps |
| Silent revocation or shadow entitlements | Low | High | Transparency log with STH proofs |
| Cost spikes from streaming top-k | Medium | Medium | Budgets, cardinality limits |
| Bypass via custom query SKU | Low | High | Templates-only policy via OPA |
| Region/residency violations | Low | High | Region scoped entitlements |
