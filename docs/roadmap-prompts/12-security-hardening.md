# Prompt #12: Security Hardening - SCIM/OIDC/WebAuthn + STRIDE + Audit + Tripwires

**Target**: Core GA Q3 2025 (Zero Criticals Before Release)
**Owner**: Security/DevSecOps team
**Depends on**: SSO (existing), Audit service, OPA, Red team

---

## Pre-Flight Checklist

```bash
# ✅ Check existing SSO/SCIM
ls -la services/enterprise/src/sso-manager.ts

# ✅ Verify audit infrastructure
ls -la services/audit/ services/audit_svc/

# ✅ Check security scanning tools
which trivy grype
git log --grep="security\|cve\|vuln" | head -20
```

---

## Claude Prompt

```
You are implementing security hardening for IntelGraph Core GA - zero criticals before release.

CONTEXT:
- Existing: services/enterprise/src/sso-manager.ts (OIDC, SAML, SCIM)
- Stack: Node.js, Neo4j, PostgreSQL, Redis
- Security: Must pass red team assessment before GA
- Frontend: apps/web/src/components/

REQUIREMENTS:
Harden Core GA security to achieve zero criticals:

1. **SCIM User/Group Sync** (Already Implemented):
   - Verify: services/enterprise/src/sso-manager.ts has SCIM 2.0
   - Endpoints: POST /scim/v2/Users, GET /scim/v2/Users/{id}, PATCH, DELETE
   - Groups: POST /scim/v2/Groups, membership sync
   - Test: Okta/AzureAD SCIM provisioning
   - Audit: Log all SCIM operations (user created, updated, deleted)

2. **OIDC SSO** (Already Implemented):
   - Verify: OIDC discovery, token validation, refresh tokens
   - Providers: Support generic OIDC (Okta, Auth0, Keycloak, AzureAD)
   - Security:
     - Validate issuer (iss claim)
     - Verify signature (JWKS)
     - Check expiration (exp claim)
     - Anti-CSRF: State parameter
     - PKCE: Proof Key for Code Exchange

3. **Step-Up Auth via WebAuthn/FIDO2**:
   - Implement: services/enterprise/src/webauthn.ts
   - Use case: Access to sensitive data requires FIDO2 key
   - Flow:
     1. User requests sensitive field
     2. System prompts: "Insert FIDO2 key"
     3. WebAuthn challenge/response
     4. Grant time-limited access (1 hour)
   - Libraries: @simplewebauthn/server (Node.js)
   - Store: Public keys in PostgreSQL (user_credentials table)

4. **Comprehensive Audit Search**:
   - Extend: services/audit/ (or services/audit_svc/)
   - Schema: {id, timestamp, userId, action, resource, decision, policyVersion, reason, ip, userAgent}
   - Indexes: timestamp, userId, action, resource
   - Full-text search: Elasticsearch or PostgreSQL GIN index
   - UI: apps/web/src/components/admin/AuditSearch.tsx
   - Filters: User, action, date range, resource type
   - Export: CSV, JSON

5. **Selector Misuse Tripwires**:
   - Detect: Unusual query patterns
   - Examples:
     - Mass entity access (>1000 in 1 hour)
     - Off-hours queries (outside 9-5, configurable)
     - Sensitive field access without recent auth
     - Repeated authorization failures (>10 in 5 min)
   - Action: Log, alert, rate-limit, or block
   - UI: apps/web/src/components/security/TripwireAlerts.tsx

6. **Quarterly Red-Team Hooks**:
   - Scheduled: Quarterly red team exercises
   - Scope: STRIDE threat model coverage (see below)
   - Hooks: Automated vulnerability scanning (Trivy, Grype, Snyk)
   - Manual: Penetration testing, social engineering
   - Report: Document findings, track remediation
   - Goal: Zero criticals before GA

7. **Policy Simulation Endpoint**:
   - Extend: server/src/routes/authz.ts (from Prompt #3)
   - POST /api/authz/simulate
   - Payload: {proposedPolicyChanges, affectedUsers[]}
   - Returns: {impactReport: {usersAffected, accessGranted[], accessRevoked[]}}
   - Use case: Admin tests new policy → See who loses access
   - Prevent: Accidental lockouts

8. **STRIDE Threat Model**:
   - Document: SECURITY/STRIDE-threat-model.md
   - Categories:
     - Spoofing: SSO, MFA, WebAuthn
     - Tampering: Audit logs, provenance chains
     - Repudiation: Non-repudiation via signatures
     - Information Disclosure: ABAC, redaction, encryption
     - Denial of Service: Rate limiting, cost guard
     - Elevation of Privilege: RBAC, OPA policies
   - Mitigations: Map each threat → Control

DELIVERABLES:

1. services/enterprise/src/webauthn.ts
   - export class WebAuthnManager
   - Methods: registerCredential(userId), authenticate(userId, challenge)
   - Libraries: @simplewebauthn/server

2. services/audit/ (extend existing or create)
   - Full-text search: Add Elasticsearch integration or PostgreSQL GIN
   - Indexes: Optimize for common queries
   - Retention: 7 years (configurable)

3. server/src/middleware/tripwire.ts
   - export class TripwireMonitor
   - Methods: detectMassAccess(), detectOffHours(), detectRepeatedFailures()
   - Actions: Log, alert (Prometheus), rate-limit, block

4. server/src/routes/authz.ts (extend from Prompt #3)
   - POST /api/authz/simulate (policy impact analysis)

5. apps/web/src/components/admin/AuditSearch.tsx
   - Search UI: Filters (user, action, date, resource)
   - Table: Results with pagination
   - Export: CSV button

6. apps/web/src/components/security/TripwireAlerts.tsx
   - Dashboard: Recent tripwire events
   - Alerts: Color-coded (yellow=warn, red=critical)
   - Actions: Acknowledge, investigate, dismiss

7. apps/web/src/components/auth/WebAuthnPrompt.tsx
   - Modal: "Insert FIDO2 key to access this field"
   - WebAuthn flow: navigator.credentials.get()

8. SECURITY/STRIDE-threat-model.md
   - Document: Threat model with mitigations
   - Table: Threat | Impact | Likelihood | Mitigation | Status

9. SECURITY/red-team-checklist.md
   - Checklist: Quarterly red team tasks
   - Scope: Injection, XSS, CSRF, auth bypass, privilege escalation
   - Tools: OWASP ZAP, Burp Suite, Metasploit

10. scripts/security/
    - scan-dependencies.sh (Trivy, Grype)
    - scan-containers.sh (Trivy on Docker images)
    - scan-secrets.sh (Gitleaks)

11. observability/prometheus/alerts/security-alerts.yaml
    - Alert: TripwireMassAccess (>1000 entities in 1 hour)
    - Alert: TripwireOffHours (access outside business hours)
    - Alert: TripwireRepeatedFailures (>10 authz failures in 5 min)

12. Tests:
    - services/enterprise/tests/test_webauthn.py (or .test.ts)
    - server/tests/tripwire.test.ts
    - server/tests/authz-simulate.test.ts
    - E2E: apps/web/tests/e2e/webauthn.spec.ts

ACCEPTANCE CRITERIA:
✅ Zero critical vulnerabilities (Trivy, Grype, Snyk scans)
✅ Red team assessment: No high/critical findings
✅ SCIM sync works with Okta/AzureAD (integration test)
✅ WebAuthn step-up auth blocks access without FIDO2
✅ Audit search returns results <1s (p95)
✅ Tripwire alerts fire for test attacks (mass access, off-hours)
✅ Policy simulation prevents accidental lockouts

TECHNICAL CONSTRAINTS:
- SCIM: SCIM 2.0 spec compliance (RFC 7643, 7644)
- OIDC: OpenID Connect Core 1.0 compliance
- WebAuthn: W3C WebAuthn Level 2 spec
- Audit log: Immutable (INSERT-only table)
- Tripwires: Configurable thresholds (env vars or config file)
- STRIDE: Document all mitigations with references

SAMPLE WEBAUTHN REGISTRATION (server):
```typescript
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';

export class WebAuthnManager {
  async startRegistration(userId: string) {
    const options = await generateRegistrationOptions({
      rpName: 'IntelGraph',
      rpID: 'intelgraph.io',
      userID: userId,
      userName: `user-${userId}`,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
    // Store challenge in session
    return options;
  }

  async finishRegistration(userId: string, response: any, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: 'https://intelgraph.io',
      expectedRPID: 'intelgraph.io',
    });

    if (verification.verified) {
      // Store credential in DB
      await this.storeCredential(userId, verification.registrationInfo);
    }

    return verification;
  }
}
```

SAMPLE TRIPWIRE DETECTION:
```typescript
export class TripwireMonitor {
  async detectMassAccess(userId: string, threshold: number = 1000): Promise<boolean> {
    // Query audit log for recent entity accesses
    const count = await db.query(`
      SELECT COUNT(*) FROM audit_log
      WHERE user_id = $1
        AND action = 'read'
        AND resource_type = 'entity'
        AND timestamp > NOW() - INTERVAL '1 hour'
    `, [userId]);

    if (count > threshold) {
      await this.triggerAlert('mass_access', { userId, count, threshold });
      return true;
    }
    return false;
  }

  async detectOffHours(userId: string): Promise<boolean> {
    const hour = new Date().getHours();
    const isOffHours = hour < 9 || hour > 17; // 9am-5pm

    if (isOffHours) {
      await this.triggerAlert('off_hours_access', { userId, hour });
      return true;
    }
    return false;
  }

  async triggerAlert(type: string, metadata: any) {
    // Publish to Prometheus, Slack, etc.
    console.warn(`[TRIPWIRE] ${type}:`, metadata);
    // Increment Prometheus counter
    tripwireAlerts.inc({ type });
  }
}
```

SAMPLE POLICY SIMULATION:
```typescript
export async function simulatePolicyChange(req: Request, res: Response) {
  const { proposedPolicyChanges, affectedUsers } = req.body;

  // Evaluate current policy for each user
  const currentAccess = await Promise.all(
    affectedUsers.map(async (userId) => {
      const allowed = await opa.evaluate('intelgraph/allow', { user: { id: userId }, action: 'read', resource: { type: 'entity' } });
      return { userId, allowed };
    })
  );

  // Temporarily apply proposed policy
  opa.loadPolicy(proposedPolicyChanges);

  // Re-evaluate
  const newAccess = await Promise.all(
    affectedUsers.map(async (userId) => {
      const allowed = await opa.evaluate('intelgraph/allow', { user: { id: userId }, action: 'read', resource: { type: 'entity' } });
      return { userId, allowed };
    })
  );

  // Restore original policy
  opa.loadPolicy(originalPolicy);

  // Compare
  const accessGranted = newAccess.filter((n, i) => !currentAccess[i].allowed && n.allowed);
  const accessRevoked = newAccess.filter((n, i) => currentAccess[i].allowed && !n.allowed);

  res.json({
    impactReport: {
      usersAffected: affectedUsers.length,
      accessGranted: accessGranted.map(a => a.userId),
      accessRevoked: accessRevoked.map(a => a.userId),
    },
  });
}
```

SAMPLE STRIDE THREAT MODEL (SECURITY/STRIDE-threat-model.md):
```markdown
# STRIDE Threat Model - IntelGraph

## Spoofing
- **Threat**: Attacker impersonates user
- **Impact**: High
- **Likelihood**: Medium
- **Mitigations**:
  - OIDC SSO with JWT validation
  - MFA (TOTP, FIDO2)
  - WebAuthn for step-up auth
- **Status**: ✅ Implemented

## Tampering
- **Threat**: Attacker modifies audit logs
- **Impact**: Critical
- **Likelihood**: Low
- **Mitigations**:
  - Immutable audit log (INSERT-only)
  - Provenance chains with signatures
  - Merkle trees for evidence
- **Status**: ✅ Implemented

## Repudiation
- **Threat**: User denies action
- **Impact**: Medium
- **Likelihood**: Low
- **Mitigations**:
  - Non-repudiation via Ed25519 signatures
  - Audit trail with IP, user-agent
- **Status**: ✅ Implemented

## Information Disclosure
- **Threat**: Unauthorized data access
- **Impact**: Critical
- **Likelihood**: Medium
- **Mitigations**:
  - ABAC/RBAC with OPA
  - Field-level redaction
  - Encryption at rest (AES-256)
- **Status**: ✅ Implemented

## Denial of Service
- **Threat**: Attacker overwhelms system
- **Impact**: High
- **Likelihood**: Medium
- **Mitigations**:
  - Rate limiting (600 req/min)
  - Slow query killer (>30s)
  - Cost guard (budget limits)
- **Status**: ✅ Implemented

## Elevation of Privilege
- **Threat**: User gains unauthorized privileges
- **Impact**: Critical
- **Likelihood**: Low
- **Mitigations**:
  - RBAC + ABAC enforcement
  - OPA policy-by-default
  - Authority binding (warrants)
- **Status**: ✅ Implemented
```

OUTPUT:
Provide:
(a) WebAuthn implementation
(b) Tripwire monitor (mass access, off-hours, repeated failures)
(c) Audit search UI
(d) Policy simulation endpoint
(e) STRIDE threat model document
(f) Red team checklist
(g) Security scanning scripts
(h) Tests (WebAuthn, tripwires, policy simulation)
(i) Security audit report (pre-GA)
```

---

## Success Metrics

- [ ] Zero critical vulnerabilities (Trivy, Grype, Snyk)
- [ ] Red team: No high/critical findings
- [ ] SCIM: Okta/AzureAD integration tests pass
- [ ] WebAuthn: FIDO2 step-up auth works
- [ ] Tripwires: Fire alerts for test attacks (100% detection)
- [ ] Policy simulation: Prevent accidental lockouts

---

## Follow-Up Prompts

1. **CASB integration**: Cloud Access Security Broker (Netskope, Zscaler)
2. **SIEM export**: Send audit logs to Splunk, Datadog, Sumo Logic
3. **Bug bounty**: Launch public bug bounty program (HackerOne)

---

## References

- Existing SSO/SCIM: `services/enterprise/src/sso-manager.ts`
- WebAuthn: https://webauthn.guide/
- @simplewebauthn/server: https://simplewebauthn.dev/
- STRIDE: https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- SCIM 2.0: https://scim.cloud/
