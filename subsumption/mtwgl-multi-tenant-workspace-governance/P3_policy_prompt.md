# P3: MTWGL Policy & Secret Governance

You are implementing the policy engine and secret governance for Summit workspaces.

**Goal:** Provide tenant-aware rules for data residency, retention, allowed tools, agent autonomy, and scoped secrets.

**Constraints:**
- Implement a tenant-scoped policy engine (e.g., integrating with OPA).
- Policies must control which skills/agents can run in a given workspace.
- Implement tenant-scoped encryption keys and secret stores (no global shared secrets).
- Allow tenant admins to override workspace-level guardrails.

**Deliverables:**
- Policy engine integration for tenant and workspace levels.
- Secret management service supporting tenant-scoped encryption keys.
- RBAC model for tenant admins vs workspace operators.
