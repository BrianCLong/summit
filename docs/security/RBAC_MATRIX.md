# RBAC Matrix

This matrix defines the explicit permissions available in the Summit backend and which roles receive them.

## Roles

- **superadmin**: Full control for platform operators.
- **admin**: Tenant-level administrator with configuration and write privileges.
- **analyst**: Operational user with read access to tenant data.
- **viewer**: Read-only consumer for audits or oversight.

## Permissions

- `manage_users`: Manage users and roles inside a tenant.
- `read_tenant_data`: Read tenant-scoped data.
- `write_tenant_data`: Write or modify tenant-scoped data.
- `execute_dangerous_action`: Perform potentially destructive operations that may require step-up authentication.

## Matrix

| Role       | manage_users | read_tenant_data | write_tenant_data | execute_dangerous_action |
| ---------- | ------------ | ---------------- | ----------------- | ------------------------ |
| superadmin | ✅           | ✅               | ✅                | ✅                       |
| admin      | ✅           | ✅               | ✅                | ✅                       |
| analyst    | ❌           | ✅               | ❌                | ❌                       |
| viewer     | ❌           | ✅               | ❌                | ❌                       |

## Helper Usage

Use the `can(permission, ctx)` helper to make authorization explicit and testable. The helper enforces role-based permissions and prevents cross-tenant access when both caller and resource tenants are provided.

```ts
import { can } from "../../server/src/authz/can";
import { Permission, Role } from "../../server/src/authz/permissions";

const result = can(Permission.WRITE_TENANT_DATA, {
  role: Role.ADMIN,
  tenantId: "tenant-a",
  resourceTenantId: "tenant-a",
});

if (!result.allowed) {
  throw new Error(`Forbidden: ${result.reason}`);
}
```
