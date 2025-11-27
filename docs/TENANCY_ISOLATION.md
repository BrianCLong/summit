# Tenancy Isolation Audit & Best Practices

## Audit Findings

### 1. Direct Object Reference Vulnerabilities
We identified that `InvestigationRepo` and `EntityRepo` were using ID-based `UPDATE` and `DELETE` operations without verifying that the resource belonged to the requesting tenant. This could allow a user from Tenant A to modify or delete resources in Tenant B if they guessed the resource ID.

### 2. Remediation
We have updated the repository methods to enforce tenant isolation:

*   `InvestigationRepo.update(input, tenantId)`
*   `InvestigationRepo.delete(id, tenantId)`
*   `EntityRepo.update(input, tenantId)`
*   `EntityRepo.delete(id, tenantId)`

All SQL queries now include `AND tenant_id = $N` in the `WHERE` clause.
Neo4j operations now include `{ tenantId: $tenantId }` in the `MATCH` clause.

### 3. API Layer
The GraphQL resolvers in `core.ts` have been updated to pass the `tenantId` from the context to these repository methods.

## Best Practices for Engineers

### Database Access
*   **Always** include `tenant_id` in your `WHERE` clauses for PostgreSQL queries.
*   **Always** include `tenantId` property in your Neo4j `MATCH` patterns.
*   **Never** rely solely on UUID uniqueness for security.

### API Development
*   **Guard Clauses:** Ensure every resolver or route handler extracts `tenantId` from the authenticated context.
*   **Context Propagation:** Pass the `tenantId` down to the service and repository layers. Do not rely on the service to "figure it out" from global state.

### Testing
*   **Multi-Tenant Tests:** Write tests that explicitly create two tenants and attempt cross-tenant access.
*   **Mocking:** When mocking DB calls, verify that the generated SQL or Cypher includes the tenant isolation predicates.

## Remaining Risks
*   **Copilot / LLM Queries:** The `CopilotNLQueryService` generates Cypher from natural language. While we added guardrails, complex generated queries must be carefully reviewed to ensure they don't bypass tenant filters.
*   **Legacy Code:** Older services using raw SQL might still be vulnerable. A full grep audit for `DELETE FROM` and `UPDATE` without `tenant_id` is recommended.
