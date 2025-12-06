---
feature: IntelGraph Multi-Tenant Queries
owner: Graph Platform (graph-security@summit)
service-area: knowledge graph / query layer
last-updated: 2026-05-08
review-cadence: quarterly
---

## Assets
- Tenant-scoped graph datasets, embeddings, indices, and search caches.
- Query plans, lineage metadata, and result sets (including sensitive intelligence objects).
- Access control policies (RBAC/ABAC), tenant routing metadata, and per-tenant rate/usage limits.
- Audit logs for query initiation, expansion, cross-tenant joins, and export operations.

## Entry Points
- GraphQL/REST query endpoints via gateway; persisted queries and ad-hoc query builder.
- Background query schedulers and saved search refresh jobs.
- Maestro/automation-triggered queries and API clients.
- Export/download flows and inter-service calls from reporting/analytics.

## Trust Boundaries
- Internet/clients → API gateway (authn/z, input validation, rate limits).
- Gateway → knowledge graph services (query planner, execution engines, cache tiers).
- Tenant isolation boundaries across shared clusters, caches, and storage.
- Third-party enrichers and model endpoints used during query expansion/ranking.

## Threats (STRIDE + misuse)
- **Spoofing**: Token reuse across tenants; impersonation via misbound tenant IDs in headers/context.
- **Tampering**: Manipulated query plans to bypass filters; cache poisoning; tampered persisted queries.
- **Repudiation**: Missing per-tenant audit of query expansions or exported datasets.
- **Information Disclosure**: Cross-tenant data leakage via joins/expansion, embedding leakage, overly broad exports.
- **Denial of Service**: Expensive graph traversals, adversarial queries targeting hot partitions, cache busting.
- **Elevation of Privilege**: Policy gaps letting lower-privilege roles run admin-level queries or exports.
- **Abuse/misuse & supply chain**: Prompt/LLM-driven query expansion exfiltrating data; malicious enricher responses; unsafe defaults for saved searches.

## Mitigations
- Enforce tenant-scoped tokens with audience checks; bind tenant context at gateway and re-validate downstream.
- ABAC/RBAC guardrails in query planner; default deny for cross-tenant joins; signed persisted queries with immutable filters.
- Per-tenant caches and data planes; cache key scoping; export size/row limits with watermarking.
- Runtime safety: query cost estimation, circuit breakers, rate limits by tenant/user/IP; kill switches for runaway jobs.
- Full audit of queries, expansions, and exports with tenant/user attribution; anomaly detection on cross-tenant patterns.
- LLM/prompt-driven expansion constrained by allowlisted templates and redaction of sensitive fields before model calls.
- Dependency integrity checks for enricher connectors; sandboxed execution for third-party callbacks.

## Residual Risk
- Advanced inference attacks on embeddings; mitigated by differential privacy/redaction for sensitive attributes.
- Performance trade-offs from strict isolation may impact latency; monitor SLOs and tune cache partitioning.
- Reliance on external enrichers may introduce untrusted data; sandboxing reduces but does not eliminate risk.
