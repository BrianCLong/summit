# Multi-Tenancy Testing Guide

This guide outlines how to validate Summit's multi-tenant backend after the schema- and graph-level isolation changes.

## Prerequisites

- PostgreSQL and Neo4j instances reachable from the backend.
- `DATABASE_URL`, `NEO4J_URI`, and related credentials set in the environment.
- A JWT issuer capable of minting tokens that include `tenantId` (or equivalent) and role claims.

## Database Preparation

1. **Run migrations**
   ```bash
   cd server
   npm run db:migrate
   ```
   This creates the `tenants` metadata table plus helper functions that provision per-tenant schemas on demand.

2. **Provision tenant schemas**
   - Tenant schemas are created automatically the first time a request executes with a new `tenantId`.
   - To pre-create a schema, call the helper function directly:
     ```sql
     SELECT ensure_tenant_schema('acme-corp');
     ```

3. **Verify schema contents**
   ```sql
   SET search_path TO tenant_acme_corp, public;
   \dt
   ```
   Ensure core tables (`entities`, `relationships`, `investigations`, etc.) exist inside the tenant schema.

## Neo4j Namespace Verification

1. Authenticate to Neo4j with admin rights and list databases:
   ```cypher
   SHOW DATABASES;
   ```
   After executing a tenant-scoped resolver, a database named `tenant_<normalized_id>` should appear.

2. Switch to the tenant graph and confirm isolation:
   ```cypher
   :use tenant_acme_corp
   MATCH (n) RETURN count(n);
   ```
   Data from other tenants should be invisible.

## GraphQL End-to-End Tests

1. **Create JWTs**
   - Include `tenantId` and role claims (e.g., `roles: ["ADMIN"]`).
   - Example payload snippet:
     ```json
     {
       "userId": "user-123",
       "email": "admin@acme.example",
       "roles": ["ADMIN"],
       "tenantId": "acme-corp"
     }
     ```

2. **Run tenant-scoped mutations**
   - Create an entity:
     ```graphql
     mutation {
       createEntity(input: {
         tenantId: "acme-corp",
         kind: "Person",
         labels: ["Executive"],
         props: { name: "Ada" }
       }) {
         id
       }
     }
     ```
   - Verify the entity exists only when querying with the same tenant token.

3. **Cross-tenant rejection**
   - Reuse the entity ID with a token that has a different `tenantId` claim and confirm a `CROSS_TENANT_ACCESS_DENIED` error is returned.

4. **Schema isolation checks**
   - Execute a query against another tenant and confirm no shared data is returned.
   - Inspect PostgreSQL to ensure rows are written into the tenant-specific schema.

5. **OPA/RBAC compatibility**
   - Validate feature-gated mutations (e.g., `triggerN8n`) still consult tenant-aware RBAC policies.

## Cleanup

- Remove test data by dropping the tenant schema:
  ```sql
  DROP SCHEMA tenant_acme_corp CASCADE;
  ```
- Drop the Neo4j tenant database if needed:
  ```cypher
  :use system
  DROP DATABASE tenant_acme_corp IF EXISTS;
  ```

Document results and share with the security team for audit sign-off.
