# WorkOS Identity Infrastructure vs Summit Identity Graph

Summit readiness remains governed by `docs/SUMMIT_READINESS_ASSERTION.md`; this brief defines the
present-state architecture stance for enterprise identity subsumption in clean-room terms.

## Executive Position

WorkOS is a strong enterprise identity middleware layer for SaaS teams that need rapid support for
SSO, SCIM, RBAC, and enterprise audit expectations. Summit can subsume this value by treating
identity as a first-class graph domain joined to governance, policy, and agent runtime controls.

## WorkOS Capability Baseline

WorkOS acts as an abstraction between enterprise identity providers and SaaS applications:

- Inbound standards: SAML 2.0, OIDC, OAuth 2.0.
- Lifecycle sync: SCIM directory provisioning and updates.
- Access model: role-based authorization primitives.
- Evidence channel: enterprise audit events for SOC2/SIEM workflows.
- Onboarding: hosted enterprise setup for IdP connection and domain verification.

## Summit Subsumption Target

Summit extends identity from authentication plumbing into organizational intelligence.

### 1) Identity Graph (not only user tables)

Model identity as graph entities and relationships (person, org, team, project, delegated authority,
resource affinity, trust lineage), enabling structural and behavioral analysis unavailable in flat RBAC
schemas.

### 2) Policy-Driven ABAC + Relationship Constraints

Enforce access with attributes and relationship context, not just role labels:

- Subject attributes: role, clearance, mission assignment, risk score.
- Resource attributes: dataset classification, tenancy, provenance level.
- Relationship constraints: explicit project linkage, supervisory chain, task delegation.

### 3) Agent-Inherited Authorization

All agent actions execute with inherited human authority plus runtime policy checks to prevent
privilege escalation and prompt-mediated data exfiltration.

### 4) Audit Graph Instead of Flat Logs

Represent activity as connected evidence edges (actor -> action -> target -> time -> policy decision)
for faster incident reconstruction, drift detection, and compliance traceability.

### 5) Enterprise Directory Ingestion as Intelligence Input

Treat Okta/Entra/Workday/Slack/GitHub identity and membership signals as ingestible graph sources to
support organizational mapping, access anomaly detection, and decision-flow analysis.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection, token replay, role inflation, delegated-agent abuse,
  policy bypass attempts, audit tampering.
- **Mitigations**:
  - Signed policy decisions and immutable provenance links.
  - Least-privilege defaults with explicit delegation expiry.
  - Deterministic policy-as-code enforcement (OPA/ABAC gates).
  - Continuous runtime telemetry on authz denials and anomalous access paths.

## Delivery Roadmap (6-8 week governed path)

1. **Week 1-2: Identity normalization service**
   - Normalize SSO/OIDC assertions and SCIM payloads into Summit identity schema.
2. **Week 2-3: Policy layer hardening**
   - Implement ABAC + relationship guards with deterministic policy tests.
3. **Week 3-5: Agent auth propagation**
   - Bind agent execution context to user/session authority and enforce bounded delegation.
4. **Week 5-6: Audit graph pipeline**
   - Stream auth and action events into graph-backed provenance views.
5. **Week 6-8: Enterprise onboarding + verification**
   - Add connector setup UX and evidence artifacts for readiness/controls validation.

## Strategic Outcome

WorkOS remains a valid integration option for baseline enterprise identity acceleration. Summit's
strategic moat is to convert identity from a login utility into a governed intelligence layer that
joins access, behavior, and organizational context.
