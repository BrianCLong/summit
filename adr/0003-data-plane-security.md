# 0003-data-plane-security

## Status
Proposed

## Context
The platform relies on Postgres, Neo4j, Redis, and Kafka to power intelligence workloads. Day-one launch must guarantee confidentiality for regulated datasets while enabling offline/air-gapped deployments.

## Decision
Segment the data plane into **stateful clusters per environment** with mutual TLS enforced via SPIFFE identities and short-lived certificates. Kafka topics, Postgres schemas, and Neo4j databases are namespaced per tenant. Redis caches run in isolated shards dedicated to tenant cohorts (shared, ST-DED) to avoid key collisions.

## SLO & Cost Trade-offs
- Dedicated shards increase baseline infrastructure cost by ~20% but hold P99 query latency under 500 ms by reducing cross-tenant contention.
- SPIFFE/SPIRE automation adds operational overhead yet avoids manual certificate rotation breaches and maintains 99.9% auth availability.

## Consequences
- Requires automation to provision tenant schemas, Kafka ACLs, and Redis shards during onboarding.
- Offline/air-gapped mode necessitates periodic certificate authority sync and policy bundle mirroring.

## Rollback Plan
- **Rollback if** SPIFFE issuance fails for >1% of service-to-service handshakes during canary validation, causing GraphQL error rate >1%.
- Temporarily revert to static mTLS secrets managed by HashiCorp Vault while investigating SPIFFE automation, keeping tenant namespaces intact.
