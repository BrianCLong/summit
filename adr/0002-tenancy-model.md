# 0002-tenancy-model

## Status
Proposed

## Context
We must ship a regulated-friendly SaaS offering that supports both shared and dedicated tenancy without fragmenting the control plane. Customers expect day-one availability while meeting contractual isolation requirements and low latency (<200 ms p95) for GraphQL calls.

## Decision
Adopt a **multi-tenant SaaS control plane** with logical tenant isolation enforced through OPA ABAC policies and per-tenant encryption keys. Regulated buyers can opt into **single-tenant dedicated (ST-DED) pods** that reuse the control plane but isolate data-plane namespaces and Kafka topics.

## SLO & Cost Trade-offs
- Multi-tenant control plane keeps unit cost low (shared API tier and observability) while preserving 99.9% availability SLO through pooled redundancy.
- ST-DED pods incur ~35% higher infrastructure cost per tenant but shrink noisy-neighbor risk and simplify regulatory attestations.

## Consequences
- Simplified operations and governance via centralized policy management.
- Requires rigorous tenant-aware telemetry and billing to monitor fairness.
- ST-DED customers demand capacity reservations, increasing forecasting complexity.

## Rollback Plan
- **Rollback if** OPA policy evaluations add >15 ms p95 latency for GraphQL mutations over two consecutive release windows.
- Revert to per-tenant service stacks by redeploying dedicated gateway instances per tenant and disabling shared control-plane routing while maintaining tenant encryption keys.
