# ADR: CompanyOS Authorization Model v0 (ABAC-ready)

## Status

Accepted

## Date

2025-12-07

## Context

CompanyOS requires a robust authorization system that:

1. Supports multi-tenant isolation
2. Enables role-based access control (RBAC)
3. Is extensible to attribute-based access control (ABAC)
4. Can integrate with OPA (Open Policy Agent) in production
5. Provides consistent authorization patterns across services

## Decision

### AuthContext Structure

Every request carries an `AuthContext` with:

```typescript
interface AuthUser {
  id: string;
  email: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
}

interface GraphQLContext {
  req: Request;
  res: Response;
  user?: AuthUser;
  requestId: string;
  logger: Logger;
  clientIp: string;
}
```

### Policy Decision Point

A centralized `checkPermission()` function serves as the policy decision point:

```typescript
function checkPermission(
  user: AuthUser | undefined,
  action: string,
  resource: string,
  resourceTenantId?: string,
): AccessDecision
```

Returns:
```typescript
interface AccessDecision {
  allowed: boolean;
  reason: string;
  tenantId?: string;
  userId?: string;
  resource: string;
  action: string;
  obligations?: string[];
}
```

### Tenant Actions

Standard actions for tenant operations:

| Action | Description |
|--------|-------------|
| tenant:create | Create new tenants |
| tenant:read | View tenant details |
| tenant:update | Modify tenant settings |
| tenant:delete | Archive tenants |
| tenant:list | List all tenants |
| tenant:manage_features | Toggle feature flags |
| tenant:view_audit | View audit logs |

### Role Definitions

| Role | Permissions |
|------|-------------|
| platform-admin | All actions (full access) |
| tenant-admin | read, update, view_audit (within tenant) |
| tenant-viewer | read only (within tenant) |

### Tenant Isolation Rules

1. Users can only access resources in their assigned tenant
2. Cross-tenant access requires explicit `cross-tenant:access` permission
3. Platform admins bypass tenant isolation checks

### OPA Integration Points

TODO markers indicate where OPA policy evaluation will replace hardcoded rules:

```typescript
// TODO: Replace with OPA policy decision point
// const decision = await opaClient.query({
//   input: { user, action, resource, context }
// });
```

### Middleware Pattern

```typescript
// Protect routes
app.use(stubIdentity);           // Extract user from JWT
app.use(validateTenantId);       // Validate tenant ID format
app.use(requirePermission('tenant:read'));  // Check permission
```

## Consequences

### Positive

- Consistent authorization across all endpoints
- Clean separation of policy from enforcement
- Easy migration path to OPA
- Comprehensive audit trail via AccessDecision
- Tenant isolation enforced at authorization layer

### Negative

- Initial implementation uses hardcoded rules
- OPA integration requires additional infrastructure

### Migration Path

1. Current: Hardcoded role-permission mapping
2. Phase 2: OPA sidecar with Rego policies
3. Phase 3: Centralized OPA server with policy bundles

## Related

- ADR: CompanyOS Tenant Model v0
- OPA Documentation: https://www.openpolicyagent.org/docs/
- `/companyos/policies/` - Rego policy files
