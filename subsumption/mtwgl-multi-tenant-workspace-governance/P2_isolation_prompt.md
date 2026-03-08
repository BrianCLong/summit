# P2: MTWGL Hard Isolation

You are implementing hard isolation controls for Summit's multi-tenant architecture.

**Goal:** Guarantee no cross-tenant leakage of memory, logs, evaluation data, or database rows.

**Constraints:**
- Implement row-level security (RLS) in Postgres, or explicit schema boundaries per tenant.
- Enforce strict separation of Redis caches (e.g., using prefixing or separate logical databases per tenant).
- Ensure that observability streams (logs, traces, metrics) are tagged with `tenantId` and `workspaceId` and cannot be queried across tenant boundaries without explicit system-level permission.
- Demonstrate isolation by writing a test with 3 synthetic tenants that tries to access each other's data and fails.

**Deliverables:**
- Database RLS policies or schema management code.
- Redis client configuration for tenant isolation.
- Middleware to enforce tenant context extraction and validation on every request.
