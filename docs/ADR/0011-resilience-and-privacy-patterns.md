# ADR 0011: Resilience and Decentralized Privacy Patterns for GA

## Status
Accepted

## Context
As IntelGraph approaches General Availability (GA) v1.0.0, the platform faces strict requirements for Intelligence Community production-readiness. Initial audits revealed vulnerabilities in service-to-service communication (cascading failures in ML/Graph paths) and a lack of unified PII sanitization in telemetry and audit logs.

## Decision
We will standardize on a "Highly Resilient & Privacy-First" architecture for all GA-tier services:

1.  **Circuit Breaker Pattern**: All external and mission-critical internal service calls (PostgreSQL, Neo4j, ML Inference, GNN) must be wrapped in a `CircuitBreaker`. This prevents cascading failures and provides deterministic fallback modes.
2.  **Decentralized Privacy Layer**: All services must use the `PrivacyService` for PII masking and deterministic ID anonymization (salting/hashing) before data is persisted to logs, telemetry, or caching layers.
3.  **Multi-Tier Caching**: Implement `CacheService` with L1 (In-Memory) and L2 (Redis) layers for all "Deep Graph" and "ML Prediction" endpoints to reduce backend load and protect during service degradation.

## Consequences

### Positive
- **Stability**: System remains functional (albeit degraded) during backend outages.
- **Compliance**: Automated PII masking across all observability streams fulfills strict privacy mandates.
- **Performance**: Significant reduction in P50/P95 latencies for repetitive graph analytics.

### Negative
- **Complexity**: Developers must account for fallback states in both Backend and Frontend UI.
- **Maintenance**: Requires regular "Salt Rotation" and monitoring of circuit breaker trip/reset events.
- **Developer Overhead**: New services must explicitly integrate with the Privacy/Resilience lifecycle.
