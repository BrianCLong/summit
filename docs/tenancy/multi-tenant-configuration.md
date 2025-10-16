### Options

- **Shared DB, tenant_id column** (simplest)
- **Schema‑per‑tenant** (isolation)
- **DB‑per‑tenant** (strongest)

### Enforcement

- Tenant context from **JWT** → resolvers apply `tenant_id = $ctx.tenant`
- Policy engine (OPA) evaluates ABAC on nodes/edges with policy labels

### Storage & Keys

- Per‑tenant envelope encryption; S3 prefixes `tenants/{tenantId}/…`

### Example OPA Policy (Rego)

```rego
package graph.authz

allow {
  input.user.tenant == input.resource.tenant
  not input.resource.policy.sensitivity == "sealed"
}
```

### Acceptance

- Cross‑tenant queries return **zero** records; audit logs show tenant context on each access
