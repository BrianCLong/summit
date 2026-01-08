# Multi-tenant Isolation Spec (Phase 1)

## Tenant Identity

- **Primary key:** `tenant_id` column on scoped tables (e.g., `entities`, `investigations`, Maestro pipeline/run tables).
- **Context sources:** API tokens/JWT claims (`context.tenantId`/`context.user.tenantId`), request headers (e.g., `x-tenant`), and GraphQL variables.
- **Default (dev-only):** `DEFAULT_TENANT_ID` environment variable or `default_tenant` fallback keeps single-tenant developer setups working while enforcing a consistent tenant value.

## Isolation Rules

- Every read/write must be scoped by `tenant_id` unless explicitly documented as global.
- Resolvers/services **must** resolve an effective tenant from the request context and pass it to repositories.
- Repository queries **must** append `tenant_id = ?` filters and assert returned rows match the requested tenant.
- Cross-tenant results should fail fast with an explicit error (`TenantScopeError`).

## Known Global Resources

- **Schema & migrations metadata** (e.g., `knex_migrations*`): operational, not tenant data.
- **Static configuration/seeds** (feature flag definitions, policy bundles) used across tenants but not containing tenant-scoped records.
- All other domain tables are treated as tenant-scoped in this phase.

## Patterns for Tenant-Scoped Queries

- Resolve tenant context up front: `const tenantId = resolveTenantId(context.tenantId || input.tenantId, 'resource.operation');`
- Apply DB filters centrally: use `appendTenantFilter(baseQuery, paramIndex)` to inject `tenant_id = $n` into SQL and `assertTenantMatch(row.tenant_id, tenantId, resource)` on results.
- Require tenant-bearing types for core entities (e.g., `tenantId` on `EntityUpdateInput` / `InvestigationUpdateInput`).
- In GraphQL, validate tenant input and propagate it to repositories; never rely on optional/defaults inside repositories.
- Tests should cover both positive (same-tenant) and negative (cross-tenant) access paths.

## Phase 1 Coverage

- Guardrails enforced for **IntelGraph entities** and **investigations/cases** repositories and GraphQL resolvers.
- Tenant resolution helper added to enforce the pattern and keep it extendable to other domains (Maestro pipelines/runs, etc.) in subsequent phases.
