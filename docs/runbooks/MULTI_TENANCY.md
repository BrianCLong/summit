# Multi-Tenancy & Isolation Runbook

## Core Principles

1.  **Identity Source**: The `x-tenant-id` header (or `x-tenant`) is the source of truth for the current tenant context. Users may belong to multiple tenants, but a request is always scoped to one.
2.  **Context Propagation**: The tenant ID is extracted in middleware (`lib/auth.ts`, `middleware/auth.ts`) and attached to the user object (`req.user.tenant` or `context.user.tenant`).
3.  **Data Access**: All data access (Postgres, Neo4j, Redis) MUST use the tenant ID to filter or partition data.

## How to Add a New Feature

1.  **Schema**: ensure your tables or nodes have a `tenant_id` (Postgres) or `tenantId` (Neo4j) column/property.
2.  **API/Resolver**:
    *   Extract tenant: `const tenantId = requireTenant(context);`
    *   Pass it to repositories/services.
3.  **Queries**:
    *   **Postgres**: `WHERE tenant_id = $1`
    *   **Neo4j**: `WHERE n.tenantId = $tenantId` (Use `addTenantFilter` helper if available)
    *   **Redis**: Use keys prefixed with tenant: `key:tenantId:resource`.

## Testing for Leaks

1.  Create a multi-tenant test case (e.g. `server/tests/tenant-isolation.test.ts`).
2.  Simulate a user from Tenant A trying to access Tenant B's resource.
3.  Verify that queries include the tenant filter.

## Common Pitfalls

*   **Global Caches**: ensure cache keys include tenant ID.
*   **Background Jobs**: ensure payload includes `tenantId` so workers know which tenant scope to use.
*   **Vector Search**: Be careful with global vector indices. Filter results by tenant ID immediately after retrieval if the index itself is not partitioned.
