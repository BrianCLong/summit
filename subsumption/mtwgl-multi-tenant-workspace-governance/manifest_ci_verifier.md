# Bundle Manifest + CI Verifier Spec: MTWGL

## 1. Bundle Manifest
The final Multi-Tenant Workspace & Governance Layer implementation must output the following deterministic artifacts:

- **Entity Model schema** (`Organization -> Tenant -> Workspace -> Project`).
- **Postgres RLS Policies** (Row Level Security SQL migrations).
- **Tenant Context Middleware** (Authentication, environment injection, privilege tiering).
- **Policy Engine Bundles** (OPA Rego files or policy code).
- **Secret Management Interfaces** (Tenant-scoped encryption).
- **Billing Meters** (Token and compute trackers).
- **Enterprise Hooks** (SSO SAML/OIDC handlers, Audit APIs).
- **Marketplace Model** (Internal agent/skill catalog definitions).

## 2. CI Verifier Spec

**Tests to run in CI (Isolation verification):**
- Spawn 3 synthetic tenants (`Tenant A`, `Tenant B`, `Tenant C`).
- Give them conflicting policies (e.g., Tenant A: No Python execution; Tenant B: Python execution allowed).
- Perform cross-tenant data requests (Tenant A requesting Tenant B's data). Ensure `403 Forbidden` or `404 Not Found` (due to RLS).
- Measure token usage in Tenant A and ensure Tenant B's billing is completely unaffected.
- Test that updating a global skill does not overwrite a per-tenant overridden version of that skill.

**Compliance Checks:**
- All endpoints must verify `tenantId` and `workspaceId` presence in context.
- All database queries must explicitly include `tenantId` in the `WHERE` clause or rely on tested RLS policies.
- Secrets must be fetched via a tenant-scoped key manager (no global environment variables for tenant integrations).
