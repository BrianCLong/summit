# Isolation Domains

The platform enforces explicit isolation domains so that data, execution, and observability signals remain bounded to the principal that owns them. Isolation primitives must **fail closed** and be auditable at both the service and data layers.

## Core domains

| Domain | Purpose | Isolation Key | Mandatory Controls |
| --- | --- | --- | --- |
| Tenant | Primary customer or organization boundary | `tenant_id` / `tenantId` | Row-level filters on SQL/Cypher, resolver scoping, cache key prefixing |
| Compartment | Sub-tenant segmentation for missions, programs, or clearance bands | `compartments: string[]` | Membership enforcement per request, allow-list only |
| System | Global control-plane objects (feature flags, topology) | `scope = system` | Read-only for tenants, explicit allowlists |

## Invariants

1. **No implicit context:** Every DB query and resolver must receive an explicit `tenantId` and (when applicable) compartment list from the authenticated context.
2. **Fail closed:** Missing or mismatched tenant/compartment data results in immediate rejection. Soft fallbacks are prohibited.
3. **Dual-plane coverage:** Controls must exist in both the data plane (SQL/Cypher, caches, queues) and service plane (GraphQL/REST middleware, background workers).
4. **Composable scopes:** Tenant scopes can be paired with compartment scopes to narrow blast radius without duplicating services.

## Service-layer enforcement

- **GraphQL/REST:** Wrap resolvers and handlers with tenant middleware (e.g., `withTenant`) and propagate `tenantId` + `compartments` into downstream calls.
- **Workers/streams:** Treat every message as untrusted; require `tenantId` on payloads and validate against the processing worker's allowed tenants/compartments before executing business logic.
- **Caches:** Derive cache keys via `tenantKey(tenantId, rawKey)` or equivalent prefixes so cross-tenant eviction is impossible.

## Data-layer enforcement

- **PostgreSQL:** Use helpers that inject `WHERE tenant_id = $N` automatically and reject missing tenant values. Inserts must include `tenant_id` sourced from the validated context.
- **Neo4j:** Append `WHERE n.tenantId = $tenantId` (or the appropriate alias) and attach tenant metadata on writes.
- **Queues and logs:** Encode `tenantId` and compartment metadata on every event so downstream consumers can re-validate.

## Shared utilities

The `@summit/platform-governance/isolation` module provides building blocks that fail closed by default:

- `requireTenantScope(scope)` — validates and normalizes tenant scope input.
- `scopeSqlToTenant(query, params, scope, column?)` — injects a tenant guard into SQL text and parameters.
- `enforceCompartments(targetCompartments, scope)` — asserts compartment membership before processing.
- `assertServiceIsolation(context, resource, options)` — one-shot guard combining tenant and compartment checks at service boundaries.
- `createTenantScopedParams(scope, baseParams?)` — propagates isolation metadata to downstream calls.

Adopt these helpers in new services and when refactoring existing code to ensure consistent, auditable enforcement.
