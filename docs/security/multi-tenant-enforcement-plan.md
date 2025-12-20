# Multi-Tenant Enforcement Plan (Scaffold)

This document outlines the next steps for applying tenant isolation consistently across the platform. No schema or routing changes are introduced in this PR; it establishes the plan for future work.

## Goals

- Enforce tenant-scoped access for all data access paths.
- Maintain strict separation between tenants in caches, search indexes, and logs.
- Provide clear guardrails for new services to remain tenant-aware by default.

## Planned Integrations

1. **Database Query Scoping**
   - Add tenant-aware query builders that automatically inject `tenant_id` filters for relational stores.
   - Expand Neo4j utilities to require a tenant parameter and append `tenantId` filters on node and relationship queries.
   - Validate migrations to prevent introduction of tenant-agnostic tables without explicit exceptions.

2. **Repository and Service Layers**
   - Introduce repository base classes that require a `TenantContext` argument and refuse to execute when absent.
   - Audit service methods to accept and propagate tenant context, especially around bulk operations and background jobs.

3. **Caching and Eventing**
   - Prefix cache keys with tenant identifiers to avoid cross-tenant leakage.
   - Ensure message bus topics and event payloads include tenant metadata for downstream consumers.

4. **Request Lifecycle**
   - Wire the tenant middleware globally after validation to guarantee all HTTP entry points populate `req.tenant`.
   - Add telemetry attributes (tenant, subject) to trace spans for observability and incident response.

## Rollout Checks

- Add unit tests covering the middleware integration and query helpers as they are introduced.
- Include feature flags to allow progressive rollout by route group.
- Document escape hatches for system operations that legitimately operate across tenants.
