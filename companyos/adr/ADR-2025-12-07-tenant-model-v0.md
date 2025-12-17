# ADR: CompanyOS Tenant Model v0

## Status

Accepted

## Date

2025-12-07

## Context

CompanyOS needs a multi-tenant architecture to support multiple customer organizations with isolated data, configurable feature flags, and comprehensive audit logging. The platform must support:

1. **Tenant isolation**: Each tenant's data must be logically separated
2. **Data residency**: Tenants may require data to reside in specific geographic regions
3. **Feature management**: Progressive rollout of features per tenant
4. **Security classification**: Support for different data classification levels
5. **Audit compliance**: Full audit trail of tenant operations

## Decision

### Database Schema

We implement a PostgreSQL-based tenant model with the following tables:

1. **`companyos_tenants`**: Core tenant entity
   - UUID primary key for distribution safety
   - `slug` for URL-friendly unique identifier
   - `data_region` for geographic data residency
   - `classification` for security levels (unclassified, cui, secret, top-secret)
   - `status` lifecycle states (pending, active, suspended, archived)
   - `settings` JSONB for extensible configuration

2. **`companyos_tenant_features`**: Feature flags per tenant
   - Unique constraint on (tenant_id, flag_name)
   - `config` JSONB for flag-specific configuration
   - Upsert pattern for idempotent flag updates

3. **`companyos_tenant_audit`**: Audit log
   - Immutable append-only log
   - Actor tracking (id, email, IP)
   - Change capture (before/after in JSONB)
   - Indexed for efficient querying

### API Design

- GraphQL API using Apollo Server 4
- REST health endpoints for Kubernetes probes
- Prometheus-compatible metrics endpoint

### Authorization Model (ABAC-ready)

- `AuthContext` structure captures user, tenant, roles, permissions
- `checkPermission()` function as policy decision point
- Placeholder for OPA policy engine integration
- Cross-tenant access requires explicit permission

### Standard Feature Flags

| Flag Name | Default | Description |
|-----------|---------|-------------|
| ai_copilot_access | false | Enable AI assistant features |
| billing_enabled | false | Enable billing and invoicing |
| advanced_analytics | false | Advanced analytics dashboards |
| export_enabled | true | Data export functionality |
| api_access | true | REST/GraphQL API access |
| sso_enabled | false | Single sign-on |
| custom_branding | false | Custom logos and colors |
| audit_log_export | false | Audit log exports |

## Consequences

### Positive

- Clean separation of tenant data and configuration
- Flexible feature flag system for progressive rollouts
- Comprehensive audit trail for compliance
- ABAC-ready authorization model
- Standard observability patterns

### Negative

- Additional complexity vs single-tenant
- Cross-tenant queries require careful handling
- Feature flag evaluation on every request

### Risks

- Performance impact of per-request flag evaluation (mitigated by caching)
- Schema migrations require coordination across services

## Related

- ADR: CompanyOS Authorization Model v0 (ABAC-ready)
- ADR: CompanyOS Paved Road Service Template v1
