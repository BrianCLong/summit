# Tenant Isolation

IntelGraph enforces tenant isolation through:

- `@tenantScoped` GraphQL directive requiring tenantId in context
- OPA policies (`server/policies/tenant.rego`) verifying tenant matches
- Metrics and exporters hash tenant identifiers to avoid leakage
