# Threat Model: IntelGraph Queries

- **Feature:** IntelGraph Queries (multi-tenant graph access)
- **Owner:** Graph Platform & Security Engineering
- **Last updated:** 2025-12-06
- **Review cadence:** Quarterly and before schema/engine changes

## Assets
- Tenant-separated graph data, indexes, embeddings, and query results caches.
- Access control policies, tenant routing metadata, and audit logs for graph access.
- Query execution infrastructure (APIs, workers, queues) and cost controls.

## Entry points
- GraphQL/REST endpoints for graph query and traversal operations.
- Background jobs that hydrate caches or refresh materialized views.
- Data ingestion pipelines that write to the graph and set tenant labels.
- Admin/diagnostic tools that run elevated queries or export data.

## Trust boundaries
- Public/partner APIs to internal graph services.
- Tenant isolation boundaries enforced via labels/policies vs. shared compute/storage.
- Query planning/execution engines vs. storage backends (Neo4j/Postgres/vector stores).
- Cross-service calls from Maestro/conductors issuing graph requests on behalf of users.

## Threats (STRIDE + abuse/misuse)
- **Spoofing:** Forged tenant identifiers in headers/claims; compromised service tokens issuing cross-tenant queries.
- **Tampering:** Query manipulation to bypass label filters; modification of routing metadata; poisoning of cache entries.
- **Repudiation:** Missing per-tenant audit logs for queries, exports, and admin overrides.
- **Information disclosure:** Cross-tenant data leakage via mis-scoped queries, side channels in shared caches, oversized error messages, or vector similarity confusion.
- **Denial of service:** Expensive traversals causing resource exhaustion; unbounded fan-out queries; runaway background jobs.
- **Elevation of privilege:** Role/policy misconfigurations enabling admin-only predicates; path traversal in stored procedures; unsafe custom plugins.
- **Abuse & misuse:** Automation/LLM-issued queries that ignore least-privilege scopes; bulk export misuse; inference attacks via aggregate queries.
- **Supply chain & delivery:** Vulnerable query/driver libraries; unsafe extensions; unsigned container images for graph services.

## Mitigations
- Enforce tenant context via signed claims and server-side label enforcement; forbid client-supplied tenant IDs.
- Policy evaluation (RBAC/ABAC) tied to tenant and purpose; blocklist/allowlist for admin-only predicates and procedures.
- Per-request guardrails: query depth/complexity limits, rate limits, and circuit breakers; isolate heavyweight workloads.
- Response hardening: minimal error details, per-tenant cache keys, and strict TTLs; separate caches for sensitive tenants.
- Strong auditing of queries/exports with tenant, actor, and purpose; alerts on cross-tenant anomalies and export spikes.
- Safely manage extensions/plugins (signed, pinned versions); supply-chain scanning and provenance for images and drivers.

## Residual risk and follow-ups
- Validate vector similarity isolation semantics for multi-tenant embeddings.
- Increase automated tests for policy enforcement on stored procedures and custom APOC-like utilities.
- Add deterministic runbooks for killing runaway graph jobs and restoring per-tenant cache partitions.
