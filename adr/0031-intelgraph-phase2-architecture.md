# ADR-0031: IntelGraph Phase 2 Architecture & SLO Alignment

**Date:** 2026-02-12
**Status:** Accepted
**Area:** Architecture
**Owner:** Jules (Release Captain)
**Tags:** intelgraph, architecture, slo, performance

## Context

IntelGraph is entering Phase 2, requiring strictly shippable, compliant, and observable product increments. The previous architecture (ADR-0006, ADR-0007, ADR-0011) established the baseline. However, new organizational defaults mandate stricter Service Level Objectives (SLOs) and higher concurrency.

### New SLO Targets
- **API/GraphQL Reads**: p95 ≤ 350 ms (p99 ≤ 900 ms)
- **API/GraphQL Writes**: p95 ≤ 700 ms (p99 ≤ 1.5 s)
- **Subscriptions (Real-time)**: p95 ≤ 250 ms
- **Neo4j 1-hop traversals**: p95 ≤ 300 ms
- **Neo4j 2-3 hop filtered**: p95 ≤ 1,200 ms
- **Ingest Throughput**: ≥ 50 MB/s per worker

## Decision

We will enhance the IntelGraph architecture to meet these targets through the following strategic changes:

### 1. Unified GraphQL Gateway
- Transition from a monolithic schema to a **Federated GraphQL Gateway** (Apollo Federation v2) to allow parallel development of Ingest, Provenance, and Analytics services.
- Implement **Persisted Queries** and **Safelisting** to minimize parsing overhead and prevent unauthorized expensive queries.

### 2. Enhanced Graph Data Modeling
- Implement **Temporal Modeling** (valid-time and transaction-time) directly in the graph schema to support bitemporal queries without significant overhead.
- Optimize indexes for high-cardinality properties to meet the 300ms 1-hop traversal target.

### 3. Provenance-First Ingestion
- Every ingestion event must atomically attach a provenance record.
- Use an **Append-Only Hash-Chained Ledger** for all graph mutations to ensure tamper-evidence.

### 4. ABAC via OPA (Open Policy Agent)
- Move all authorization logic to **OPA sidecars** using Rego policies.
- Ensure policy evaluation adds < 10ms to the total request latency.

### 5. Multi-Tenant Isolation
- Implement logical isolation via Neo4j labels and Postgres RLS (Row Level Security).
- Ensure cross-tenant data leakage is prevented at the database and API layers.

## Query Shape Assumptions for SLO Compliance
To meet the **p95 ≤ 350 ms** GraphQL read target, the following assumptions are made regarding query complexity:
- **Entity Detail**: Retrieval of a single node by ID with all attributes and its direct provenance record.
- **N-Neighbors**: Retrieval of a node and its 1-hop neighbors (up to 100) filtered by type.
- **Provenance Tail**: Retrieval of the last 5 events in an entity's provenance chain.
- **Pagination**: All list queries MUST use cursor-based pagination with a default page size of 20 and a maximum of 100.

## Caching Strategy and Invalidation Boundaries
- **Layer 1 (Browser/Client)**: Apollo Client Cache for UI responsiveness. Invalidation on mutations.
- **Layer 2 (Gateway)**: Persisted Query Cache in Redis (TTL: 1 hour). Safelisted queries only.
- **Layer 3 (Service-Level)**: DataLoaders for batching and per-request memoization to prevent N+1 issues.
- **Invalidation**:
    - Provenance records are immutable and cached indefinitely.
    - Entities/Relationships use a Write-Through cache pattern where updates invalidate the specific entity key in Redis.
    - Tenant-level configuration is cached with a 5-minute TTL.

## Consequences

### Positive
- Strict adherence to performance budgets ensures platform scalability.
- Improved auditability through the integrated Provenance Ledger.
- Faster development cycles through service decoupling.

### Negative
- Increased complexity in managing a federated gateway.
- Higher overhead for ingestion due to mandatory provenance hashing.
- Requires rigorous performance testing in CI to catch regressions.

## Verification
- Performance will be verified using **k6** in the CI pipeline.
- SLO compliance will be tracked via **OpenTelemetry** and visualized in Grafana.
