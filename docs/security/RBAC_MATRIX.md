# RBAC Permission Matrix

The following matrix standardizes the platform roles and the actions that each role is allowed to perform. These permissions are used by the shared `authz/permissions.ts` helper to keep endpoint checks consistent.

| Role     | Receipt Ingest | Plugin Publish | Policy Override | Admin Config |
| -------- | -------------- | -------------- | --------------- | ------------ |
| Viewer   | 🚫             | 🚫             | 🚫              | 🚫           |
| Analyst  | ✅             | 🚫             | 🚫              | 🚫           |
| Operator | ✅             | ✅             | 🚫              | 🚫           |
| Admin    | ✅             | ✅             | ✅              | ✅           |

## Definitions

- **Receipt Ingest**: Create or store signed receipts for evidence or audit trails.
- **Plugin Publish**: Publish or activate plugins and connectors that extend the platform.
- **Policy Override**: Bypass or override policy decisions (e.g., enforcement relaxations).
- **Admin Config**: Change administrative settings that affect tenants or platform-wide defaults.

## Enforcement helper

Use the exported `can(permission, ctx)` helper from `authz/permissions.ts` to perform role checks consistently across services. The helper supports explicit permission grants (for scoped overrides) and falls back to the role matrix above when explicit grants are absent.
