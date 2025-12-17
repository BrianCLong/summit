# Tenant & Partner Hierarchy Model v0

## 1. Core Entities & Relationships (Neo4j Graph Model)

This model extends our existing `Tenant` nodes to support a hierarchical structure involving Partners and Resellers.

### Entities (Nodes)

*   **`Tenant`**: The core unit of isolation. Represents a single customer environment.
    *   Properties: `tenant_id` (UUID), `name`, `status`, `classification`.
    *   Labels: `:Tenant`, `:Organization`.
*   **`Partner`**: An organization that manages multiple Tenants.
    *   Properties: `partner_id` (UUID), `name`, `agreement_type` (e.g., MSP, Reseller).
    *   Labels: `:Partner`, `:Organization`, `:Tenant` (Partners are also Tenants for their own internal ops).
*   **`Reseller`**: An organization that sits above Partners (optional, for distribution).
    *   Labels: `:Reseller`, `:Partner`, `:Organization`.
*   **`User`**: A user identity.
    *   Labels: `:User`.

### Relationships (Edges)

*   `(:Partner)-[:MANAGES {scope: 'full_admin' | 'billing_only' | 'support'}]->(:Tenant)`
    *   Defines the management relationship. The `scope` property dictates the default level of access delegated to the Partner.
*   `(:Reseller)-[:ENABLES]->(:Partner)`
    *   For multi-tier channel models.
*   `(:Tenant)-[:HAS_SUB_TENANT]->(:Tenant)`
    *   For large enterprises with departmental isolation.
*   `(:User)-[:BELONGS_TO]->(:Tenant)`
    *   The user's "home" tenant.
*   `(:User)-[:HAS_ACCESS {role: '...expiry...'}]->(:Tenant)`
    *   Explicit granted access (e.g., a Partner User accessing a Customer Tenant).

## 2. Roles & Permissions (RBAC Extension)

Leveraging `MultiTenantRBACManager` (`server/src/auth/multi-tenant-rbac.ts`), we introduce "Delegated Roles".

### Partner Roles
*   **`partner-admin`**: Full control over the Partner Tenant and administrative access to managed Customer Tenants (subject to the `:MANAGES` scope).
*   **`partner-support`**: Read-only/Debug access to managed Customer Tenants.
*   **`partner-finance`**: Access to billing/usage data across all managed Tenants.

### Delegation Logic
When a User has a role in a Partner Tenant, our RBAC resolver checks for `:MANAGES` relationships.
*   If User has `partner-admin` in `Partner A`, and `Partner A` `-[:MANAGES]->` `Tenant B`:
    *   User effectively gains `tenant-admin` (or scoped equivalent) in `Tenant B`.
    *   This is dynamic (evaluated at runtime or cached via `tenantIds` array in JWT/Session).

## 3. Constraints & Isolation

1.  **Strict Isolation**: `MATCH (t:Tenant)` queries must always be scoped. Partner queries use `MATCH (p:Partner)-[:MANAGES]->(t:Tenant)`.
2.  **Consent**: The `:MANAGES` relationship requires a "handshake" (Customer accepts Partner invitation).
3.  **Audit**: All actions performed by a Partner User on a Customer Tenant must be logged with `actor_tenant_id = PartnerID` and `target_tenant_id = CustomerID`.

## 4. Billing & Aggregation

*   **Usage**: Usage metrics (`:Signal`, `:Storage`, `:Compute`) are aggregated up the `:MANAGES` tree.
*   **Quota**: Quotas can be applied at the Tenant level OR the Partner level (e.g., "Partner Pool").
*   **Invoicing**: Partners receive a consolidated invoice for all managed Tenants.

## 5. Compliance Inheritance

*   Policies (`:Policy`) can be attached to a Partner and effectively applied to all managed Tenants via `(:Partner)-[:ENFORCES]->(:Policy)`.
*   Tenant-specific overrides are allowed if the Policy permits it.
