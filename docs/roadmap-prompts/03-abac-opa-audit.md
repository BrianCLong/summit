# Prompt #3: ABAC/OPA + Authority Binding + Audit (Core GA)

**Target**: Core GA Q3 2025
**Owner**: Security team
**Depends on**: SSO/SCIM (already implemented), OPA

---

## Pre-Flight Checklist

```bash
# ✅ Check existing SSO/SCIM implementation
ls -la services/enterprise/src/sso-manager.ts
grep -r "oidc\|saml\|scim" services/enterprise/

# ✅ Verify audit service exists
ls -la services/audit_svc/ 2>/dev/null || echo "Need to create audit service"

# ✅ Check OPA availability
docker pull openpolicyagent/opa:latest
```

**Expected**: SSO/SCIM already implemented. OPA needs to be added. Audit service may need creation.

---

## Claude Prompt

```
You are implementing ABAC/RBAC with OPA policy-by-default enforcement for IntelGraph Core GA.

CONTEXT:
- Existing: services/enterprise/src/sso-manager.ts (SSO/SCIM with OIDC, SAML, LDAP)
- Stack: Node.js + Express/Apollo, OPA (sidecar or service), Neo4j, PostgreSQL
- Frontend: apps/web/src/components/

REQUIREMENTS:
Add policy-by-default enforcement with:

1. **OPA Policy Engine Service**:
   - Create: services/opa-policy-engine/
   - Deployment: Sidecar container or standalone service (port 8181)
   - Policy bundles: services/opa-policy-engine/policies/
   - Load policies from Git or ConfigMap (Kubernetes)
   - REST API: POST /v1/data/intelgraph/allow (OPA standard)

2. **ABAC/RBAC Policies**:
   - Roles: admin, analyst, viewer, auditor
   - Attributes: tenantId, clearanceLevel, department, dataClassification
   - Policies in Rego (OPA language):
     - policies/base.rego: Core RBAC rules
     - policies/data-classification.rego: ABAC for classified data
     - policies/graph-access.rego: Entity/relationship access control
   - Example: "Analyst can read entities with classification ≤ their clearance"

3. **Authority Binding (Warrant-Based Access)**:
   - GraphQL directive: @requiresAuthority(authority: String!)
   - Example:
     ```graphql
     type Entity {
       id: ID!
       name: String!
       ssn: String @requiresAuthority(authority: "PII_ACCESS")
     }
     ```
   - Runtime check: Query OPA before resolver executes
   - UI prompt: apps/web/src/components/auth/AuthorityPrompt.tsx
   - Fields: "Why do you need access?", "Authority granted by", "Valid until"

4. **Just-in-Time Access Prompts**:
   - User requests field → Check OPA → If denied, prompt for justification
   - Log: {user, resource, authority, reason, approver, timestamp}
   - Auto-expire: Access grants expire after N hours (configurable)
   - Appeal path: If denied, show "Request Access" button → Notify admin

5. **Immutable Audit Log**:
   - Create: services/audit/ (append-only PostgreSQL table or TimescaleDB)
   - Log every authz decision: {user, action, resource, decision, policy, reason, timestamp}
   - Anomaly detection: Flag unusual patterns (e.g., mass data access, off-hours queries)
   - Alerts: Publish to Redis Streams or Kafka for SIEM integration

6. **Policy Simulation Endpoint**:
   - POST /api/authz/simulate
   - Payload: {user, action, resource, proposedPolicyChanges}
   - Returns: {allowed, affectedUsers[], impactAnalysis}
   - Use case: Admin wants to test new policy before deploying

DELIVERABLES:

1. services/opa-policy-engine/
   - Dockerfile with OPA + policy bundles
   - policies/base.rego (RBAC)
   - policies/data-classification.rego (ABAC)
   - policies/graph-access.rego (entity/relationship ACLs)
   - tests/ (unit tests for Rego policies using OPA test framework)

2. services/enterprise/src/authority-binding.ts
   - export class AuthorityBinder
   - Methods: checkAuthority(user, authority), requestAccess(user, authority, reason)
   - Integration with OPA client

3. server/src/graphql/directives/requiresAuthority.ts
   - GraphQL directive implementation
   - Intercepts resolver, queries OPA, logs decision
   - Throws AuthorizationError if denied

4. apps/web/src/components/auth/AuthorityPrompt.tsx
   - Modal dialog: "This field requires additional authority"
   - Form: reason (text), approver (dropdown), duration (hours)
   - Submit → POST /api/authz/request

5. services/audit/
   - Append-only audit log (TimescaleDB hypertable or PostgreSQL)
   - Schema: CREATE TABLE audit_log (id SERIAL PRIMARY KEY, timestamp TIMESTAMPTZ, user_id TEXT, action TEXT, resource TEXT, decision TEXT, policy TEXT, reason TEXT)
   - Indexes: timestamp, user_id, resource
   - Retention: 7 years (configurable)

6. server/src/routes/authz.ts
   - POST /api/authz/request (request access to authority)
   - POST /api/authz/simulate (simulate policy changes)
   - GET /api/authz/audit (search audit log)

7. apps/web/src/components/admin/AuditSearch.tsx
   - Search UI: Filter by user, action, resource, date range
   - Display: Timeline view, export to CSV
   - Anomaly highlights: Red flag for unusual activity

8. observability/prometheus/alerts/authz-alerts.yaml
   - Alert: TooManyDenials (>10 denials in 5 min for single user)
   - Alert: OffHoursAccess (access to classified data outside 9-5)
   - Alert: MassDataAccess (>1000 entities queried in 1 hour)

9. Tests:
   - services/opa-policy-engine/tests/base_test.rego
   - Integration: server/tests/authz.integration.test.ts
   - E2E: apps/web/tests/e2e/authority-prompt.spec.ts

ACCEPTANCE CRITERIA:
✅ GraphQL queries with @requiresAuthority block unauthorized access
✅ Authority prompt appears in UI when access denied
✅ Audit log captures 100% of authz decisions
✅ Policy simulation shows impact before deployment
✅ Anomaly alerts fire for suspicious patterns
✅ Appeal path exists (Request Access button)

TECHNICAL CONSTRAINTS:
- OPA: Use latest stable version (v0.60+)
- Rego policies: Write tests using OPA test framework (test_*.rego files)
- Audit log: Use TimescaleDB for time-series if available, else PostgreSQL
- GraphQL directive: Compatible with Apollo Server 4+
- Immutable audit: Use INSERT-only table, no UPDATE/DELETE permissions

SAMPLE REGO POLICY (policies/base.rego):
```rego
package intelgraph

import future.keywords.if

default allow = false

# Admins can do anything
allow if {
    input.user.role == "admin"
}

# Analysts can read entities
allow if {
    input.user.role == "analyst"
    input.action == "read"
    input.resource.type == "entity"
}

# PII access requires explicit authority
allow if {
    input.user.authorities[_] == "PII_ACCESS"
    input.resource.classification == "pii"
}
```

SAMPLE GRAPHQL DIRECTIVE USAGE:
```graphql
type Person {
  id: ID!
  name: String!
  email: String @requiresAuthority(authority: "PII_ACCESS")
  ssn: String @requiresAuthority(authority: "PII_ACCESS")
}
```

OUTPUT:
Provide:
(a) OPA service + Rego policies with tests
(b) GraphQL directive implementation
(c) React components (AuthorityPrompt, AuditSearch)
(d) API endpoints (authz routes)
(e) Prometheus alerts
(f) Integration tests
(g) Migration guide for existing SSO/SCIM → add OPA layer
```

---

## Success Metrics

- [ ] 100% of GraphQL resolvers respect @requiresAuthority
- [ ] Zero criticals in security audit before GA
- [ ] Audit log searchable with <1s latency
- [ ] Policy simulation prevents accidental lockouts
- [ ] Anomaly detection catches test attacks (red team validation)

---

## Follow-Up Prompts

1. **Add breakglass**: Emergency access with auto-escalation to CISO
2. **RBAC UI**: Admin panel to manage roles/authorities
3. **Policy versioning**: Track policy changes with rollback capability

---

## References

- Existing SSO/SCIM: `services/enterprise/src/sso-manager.ts`
- OPA docs: https://www.openpolicyagent.org/docs/latest/
- Rego tutorial: https://www.openpolicyagent.org/docs/latest/policy-language/
- TimescaleDB: https://docs.timescale.com/
