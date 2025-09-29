### What
- v24 Coherence slice — API + subscriptions + metrics

### Why
- Meet SLOs & enable dashboarding/canary

### Evidence
- Attach artifact from CI (.evidence/*)

### SLOs
- Read p95 ≤ 350ms; Write p95 ≤ 700ms; Err ≤ 0.1%; Sub fan‑out p95 ≤ 250ms

### Rollback
- Flag: v24.coherence=false; route reads to Postgres only

### Security/Policy
- OPA policy ids: graphql.allow, allow_write; retention standard‑365d; purpose benchmarking
