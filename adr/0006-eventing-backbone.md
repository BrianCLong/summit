# 0006-eventing-backbone

## Status
Proposed

## Context
Summit orchestrates ingestion, enrichment, and analytics workflows that span multiple services. We need durable, ordered event delivery for compliance evidence and graph projections while supporting offline mirroring.

## Decision
Standardize on **Kafka** as the event backbone with schema-registry enforced contracts. All state changes (Postgres CDC, Neo4j projections, cache invalidations) emit to Kafka topics partitioned by tenant. Producers and consumers authenticate with mTLS and ABAC policies via OPA sidecars.

## SLO & Cost Trade-offs
- Dedicated three-broker clusters per environment sustain >10k events/sec with 99.9% delivery SLO at the cost of ~$12k/year, offset by reduced point-to-point integration overhead.
- Schema registry enforcement adds <5 ms publish latency but prevents downstream contract drift that would otherwise drive outage risk.

## Consequences
- Requires stream governance (retention, ACLs, replay tooling) and on-call expertise for Kafka operations.
- Offline tenants need periodic snapshot export/import for catch-up when reconnected.

## Rollback Plan
- **Rollback if** Kafka end-to-end latency exceeds 2 s p95 for two consecutive monitoring intervals or broker instability threatens SLA.
- Fall back to direct PostgreSQL logical replication for CDC and use S3-based event fan-out while remediating Kafka cluster health.
