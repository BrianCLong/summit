# Prompt 4: Governance Layer - OPA ABAC Policy Adapter

**Tier:** 1 - Platform Services
**Priority:** ⭐️ HIGH PRIORITY
**Effort:** 1 week
**Dependencies:** Prompt 1 (for policy labels)
**Blocks:** All services (auth required)
**Parallelizable:** Yes (with Prompts 3, 7)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- Governance is critical: we use attribute-based access control (ABAC) via OPA (Open Policy Agent).
- We want a small layer that bridges application code to OPA policies, enforcing least privilege and reason-for-access prompts.

Goal:
Implement an "OPA ABAC adapter" that our services (IntelGraph, Maestro, etc.) can use to:
- Evaluate access decisions against OPA,
- Standardize input attributes,
- Enforce reason-for-access when required.

Assumptions:
- Services are HTTP-based; OPA can be called via its HTTP API.
- Use TypeScript/Node OR Python, consistent with other services.

Requirements:
1. ABAC input model
   - Subject attributes: user_id, roles, org_id/tenant_id, auth_strength (e.g., password_only, webauthn), purpose (reason_for_access).
   - Resource attributes: resource_type (entity, claim, run, artifact), resource_id, policy_labels (origin, sensitivity, legal_basis).
   - Context attributes: request_time, request_ip, operation (read/write/delete), environment (prod/staging).

2. Adapter library
   - Function: authorize(subject, resource, context) → decision (allow/deny) + obligations (e.g., "log this", "step-up-auth required").
   - Talking to OPA:
     - Configurable OPA endpoint.
     - Graceful handling of OPA errors (fail closed for sensitive resources).
   - Helpers to:
     - Normalize attributes.
     - Redact sensitive fields before logging.

3. Example policies (Rego)
   - Provide example Rego policy snippets that:
     - Enforce least privilege on high-sensitivity data.
     - Require WebAuthn for policy exceptions.
     - Deny access if legal_basis is unknown and operation is export.

4. Integration examples
   - Show how IntelGraph service or Maestro would call authorize() before serving requests.
   - Include tests that simulate different subject/resource attributes and policy outcomes.

5. Docs
   - README explaining:
     - ABAC model.
     - How to integrate with an HTTP service.
     - How to extend with new attributes.

Deliverables:
- Adapter library.
- Example Rego policies.
- Tests and README.
