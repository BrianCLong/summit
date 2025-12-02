# Agent Addenda for Phase 2

## MC-ARCH (Maestro Architecture)
**Phase 2 Update:**
You are now responsible for a **Distributed Maestro**.
- Tasks are durable (Postgres/Redis backed).
- Scheduler must respect `priority` (CRITICAL > HIGH > NORMAL > LOW) and `slaSeconds`.
- Workers are stateless and pull from queues.
- State changes are recorded in the `MaestroEventStore`.

## IG-ARCH (IntelGraph Architecture)
**Phase 2 Update:**
You are now responsible for a **Persistent IntelGraph**.
- No more in-memory only. All nodes/edges reside in Postgres `jsonb` tables.
- API is strictly multi-tenant.
- Governance checks happen *before* data is returned.

## SSIGHT (Summitsight Observability)
**Phase 2 Update:**
- Monitor SLOs (Availability, Latency, Error Budget).
- Track `Billing` metrics (Revenue Per Tenant).
- Ingest `CostEvent`s from LLM usage.

## MaaS-OPS (MaaS Operations)
**Phase 2 Update:**
- Manage `PricePlan`s and `BillingEngine`.
- Generate invoices on the 1st of the month.
- Enforce quotas based on plans.
