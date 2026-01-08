# Architectural Enforcement Points & Policy as Code

## 1. Enforcement Strategy

Isolation is not a polite request; it is a **hard architectural constraint**. We enforce these boundaries at multiple layers of the stack ("Defense in Depth").

We categorize enforcement mechanisms into:

- **Hard:** Cryptographic or Engine-level constraints (impossible to bypass via code bugs).
- **Soft:** Application-logic constraints (reliant on correct code implementation).
- **Auditable:** Detection mechanisms that alert on violation attempts.

---

## 2. Enforcement Mapping

### A. Database Layer (PostgreSQL) - **HARD**

- **Mechanism:** Row-Level Security (RLS).
- **Implementation:**
  - Every table must have a `tenant_id` column.
  - RLS Policies enforce `SELECT`, `UPDATE`, `DELETE` are scoped to `current_setting('app.current_tenant')`.
  - **Fail Closed:** If `app.current_tenant` is not set, query returns 0 rows or throws error.
- **Code Reference:** `server/src/db/migrations/` (RLS Policies).

### B. Graph Layer (Neo4j) - **SOFT (Application Enforced)**

- **Mechanism:** Cypher Query Rewriting / Mandatory Labels.
- **Implementation:**
  - All Nodes must have a `:Tenant` label or property.
  - Query Builder (Application Layer) _automatically injects_ `{ tenantId: $id }` into every `MATCH`.
  - **Mitigation:** `DualWriteSession` ensures graph writes mirror strict Postgres ownership.
- **Code Reference:** `server/src/maestro/provenance/intel-graph.ts`.

### C. API & Middleware - **SOFT**

- **Mechanism:** Context Extraction & Validation.
- **Implementation:**
  - `ensureAuthenticated` middleware verifies JWT and extracts `tenantId`.
  - `tenantContext` middleware sets the async local storage context.
  - Input Validation (Zod) rejects requests with cross-tenant IDs in bodies (where verifiable).
- **Code Reference:** `server/src/middleware/auth.ts`, `server/src/middleware/tenantContext.ts`.

### D. Streaming (Redis/NATS) - **SOFT**

- **Mechanism:** Namespace/Topic Segmentation.
- **Implementation:**
  - Redis keys prefixed with `{tenantId}:...`.
  - NATS Subjects formatted as `summit.{tenantId}.{service}.{event}`.
  - Consumers only subscribe to their own wildcard patterns.

### E. CI/CD & Governance - **HARD**

- **Mechanism:** OPA (Open Policy Agent) Gates.
- **Implementation:**
  - `conftest` runs against Terraform plans and Kubernetes manifests.
  - Prevent creation of public buckets, wildcards (\*) in IAM, or unencrypted DBs.

---

## 3. Policy as Code (Implementation Spec)

We express isolation rules using **Rego** (OPA) concepts. While we may use TS implementations for the prototype, the logic must map to these policies.

### Example 1: Access Control Policy (Pseudo-Rego)

```rego
package summit.authz

# Default Deny
default allow = false

# Allow if user belongs to tenant AND has role
allow {
    input.user.tenant_id == input.resource.tenant_id
    input.user.roles[_] == input.required_role
}

# Allow system admins to read (audit) but not write
allow {
    input.user.is_admin == true
    input.action == "read"
}
```

### Example 2: Runtime Tool Policy (Agent Restrictions)

```rego
package summit.agent

default allow_tool = false

# Allow tools listed in the agent's manifest
allow_tool {
    allowed_tools := input.agent_manifest.allowed_tools
    input.tool_name == allowed_tools[_]
}

# BLOCK "dangerous" tools for untrusted agents
deny {
    input.tool_name == "db_drop_table"
    input.agent_trust_level < 5
}
```

---

## 4. Telemetry & Audit

Enforcement is invisible without observation.

1.  **Violation Log:** Any blocked access attempt (RLS violation, Policy denial) must emit a structured log event:
    - `event: security_violation`
    - `type: isolation_breach_attempt`
    - `source: { user_id, tenant_id }`
    - `target: { resource_id, tenant_id }`
2.  **Metric:** `summit_security_isolation_failures_total` (Counter).
3.  **Alert:** > 5 failures in 1 minute -> **SEV-2 Alert**.

---

## 5. Development Guidelines

For Engineers building features:

1.  **Never** write raw SQL without `tenant_id` where clause.
2.  **Always** use the `Repo` methods that require `tenantId` as an argument.
3.  **Verify** policies in tests using `expect(call).toFailWith(Forbidden)`.
