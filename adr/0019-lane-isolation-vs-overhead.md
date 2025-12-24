# 0019 - Customer Deployment Lanes: Isolation vs Maintenance Overhead

## Status
Accepted

## Context
Enterprise customers require white-label features and rollout control without risking cross-tenant impact. Single shared pipeline makes it hard to isolate risky overrides and audit lane-specific releases.

## Decision
- Introduce per-customer lanes with dedicated config bundles and namespaced ArgoCD apps.
- Enforce guardrails through policy checks to block unsafe overrides (audit disablement, weakened auth, broad egress).
- Provide per-lane canary/rollback controls and audit logs of promotions.

## Alternatives Considered
1. **Single global pipeline with feature flags**: simpler but insufficient isolation and auditing; rejected.
2. **Separate clusters per customer**: strongest isolation but high cost/ops overhead; reserved for high-sensitivity clients only.

## Consequences
- + Better blast radius control and auditability; + faster custom rollouts.
- - Additional maintenance of lane configs; - need policy tooling to avoid drift.

## Validation
- Promotion runbook exercised per lane; policy engine rejects unsafe configs; audit log entries verified per promotion.

## References
- `docs/wave13/customer-lanes.md`
- `docs/wave13/lane-promotion-runbook.md`
