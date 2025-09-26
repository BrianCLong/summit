# Dynamic RBAC Configuration Guide

This guide explains how Summit's dynamic role-based access control (RBAC) system is configured, administered, and enforced following the introduction of the GraphQL-based RBAC management API.

## Overview

Dynamic RBAC allows security administrators to create roles, manage permissions, and assign roles to users without redeploying the platform. Configuration data is stored in PostgreSQL, cached in the RBAC service, and enforced in real time by the Node.js middleware and Open Policy Agent (OPA) policies.

### Components

- **GraphQL API** (`/graphql`): exposes mutations and queries that allow administrators to manage RBAC resources.
- **RBAC Service** (`server/src/services/rbac/RbacService.ts`): interfaces with PostgreSQL, handles caching, and provides helper methods for token enrichment.
- **PostgreSQL schema**: tables prefixed with `rbac_` store permissions, roles, assignments, and version metadata.
- **OPA policies** (`server/policies/intelgraph.rego`): evaluate user permissions for every GraphQL resolver, including wildcard semantics and tenant isolation.
- **Auth middleware**: enriches authenticated requests with up-to-date roles and permissions on every request, ensuring assignments take effect immediately.

## GraphQL Management API

All RBAC management operations require the `rbac.manage` permission (granted by default to the `ADMIN` role).

### Queries

- `rbacPermissions`: list all permissions (name, description, category, timestamps).
- `rbacRoles`: list roles with metadata and associated permissions.
- `rbacRole(id: ID!)`: fetch a single role with its permissions.
- `rbacPolicyVersion`: return the latest policy bundle version metadata (useful for auditing).

### Mutations

- `createRbacPermission(input: RbacPermissionInput!)`
- `updateRbacPermission(id: ID!, input: RbacPermissionUpdateInput!)`
- `deleteRbacPermission(id: ID!)`
- `createRbacRole(input: RbacRoleInput!)`
- `updateRbacRole(id: ID!, input: RbacRoleUpdateInput!)`
- `deleteRbacRole(id: ID!)`
- `assignRoleToUser(roleId: ID!, userId: ID!)`
- `removeRoleFromUser(roleId: ID!, userId: ID!)`
- `publishRbacPolicy(note: String)`: manually bump the policy version (useful for compliance checkpoints).

The Playwright end-to-end test `server/tests/e2e/rbac-dynamic.spec.ts` demonstrates a full workflow: an admin creates a temporary role, assigns it to a viewer, and the viewer immediately gains the associated permissions.

## PostgreSQL Schema

The migration `server/db/migrations/postgres/2025-09-15_dynamic_rbac.sql` and the bootstrap logic in `server/src/config/database.ts` create and seed the following tables:

- `rbac_permissions` — canonical list of permission strings.
- `rbac_roles` — role definitions (with an `is_system` flag for built-ins).
- `rbac_role_permissions` — join table linking roles to permissions (supports wildcard `*`).
- `rbac_assignments` — user-to-role assignments with audit timestamps.
- `rbac_policy_versions` — monotonically increasing version records for change tracking.

Default roles (`ADMIN`, `ANALYST`, `OPERATOR`, `VIEWER`) and their permission sets are inserted automatically on bootstrap. Administrators can extend or override these defaults using the GraphQL API.

## Runtime Behaviour

1. **Authentication** — Every request passes through `AuthService.verifyToken`, which now uses `RbacService` to retrieve the latest roles and permissions for the authenticated user. Tokens do not need to be regenerated after assignments; permissions are hydrated on every request.
2. **Authorization** — `GraphQLAuthzPlugin` and `AccessControl` rely on the `user.permissions` array. Wildcards (`*` and `prefix.*`) are supported consistently across the codebase and the OPA policies.
3. **OPA Enforcement** — The updated policy `server/policies/intelgraph.rego` checks for permission strings that match the GraphQL action (`query.<field>`, `mutation.<field>`) and optional field-level identifiers (`field.Type.field`). Tenant isolation is preserved by comparing `input.context.tenantId` with the authenticated user's tenant.
4. **Caching & Invalidation** — `RbacService` caches role/permission maps with a short TTL and invalidates the cache after any mutating operation. Administrators receive instant propagation after creating roles or assignments.

## Administrative Workflow

1. **List permissions** to identify the required operation (`rbacPermissions`).
2. **Create or update a role** with the desired permissions (`createRbacRole` / `updateRbacRole`).
3. **Assign the role** to users (`assignRoleToUser`).
4. (Optional) **Publish** a policy version note for compliance (`publishRbacPolicy`).

## Operational Considerations

- **Auditability** — Assignment timestamps are recorded in `rbac_assignments`. Combine with `rbac_policy_versions` for change-history reporting.
- **System Roles** — `is_system` roles are protected from deletion. Mutations throw an error if deletion is attempted.
- **Error Handling** — GraphQL mutations return descriptive errors (e.g., insufficient permissions, role not found). Administrators should monitor for `FORBIDDEN` GraphQL errors when using the API.
- **Testing** — Run `npx playwright test rbac-dynamic.spec.ts` from `server/` to validate RBAC flows end-to-end.

## Troubleshooting

- If changes do not appear immediately, ensure the requesting user has a fresh token (the middleware refreshes permissions, but expired tokens are rejected).
- Confirm PostgreSQL tables exist by running the migration or re-running server bootstrap if using an ephemeral environment.
- Review OPA logs if a request is unexpectedly denied (`POLICY_DECISION` entries include the evaluated action and matched permission).

## Next Steps

- Integrate the RBAC GraphQL operations into the admin UI.
- Automate policy version publishing during CI after schema changes.
- Extend the permission model to support attribute-based access (ABAC) if needed.
