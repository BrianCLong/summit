# STRIDE Threat Model: Governance Subsystem

**Document Version**: 1.0
**Date**: 2025-12-27
**Status**: Active
**Owner**: Security Team
**Review Cadence**: Quarterly

---

## Executive Summary

The Governance Subsystem is responsible for policy-based authorization decisions using Open Policy Agent (OPA), approval workflows, and access control enforcement. This threat model identifies 20 distinct threats across the STRIDE categories that could compromise policy integrity, authorization decisions, or governance processes.

**Key Risk Areas**:

- Policy bypass through simulation mode abuse
- Verdict tampering in transit or at rest
- Unauthorized approval escalation
- Policy version rollback attacks
- Information disclosure through verbose policy evaluation
- Denial of service through policy evaluation storms

**Critical Gaps**:

- Simulation mode enforcement lacks production guardrails
- Policy versioning allows unauthorized rollback
- Approval workflow state can be manipulated without audit trail
- OPA bundle signing is optional, not enforced
- Policy evaluation results lack integrity protection

**Overall Risk Rating**: HIGH

---

## System Overview

### Components in Scope

```
┌─────────────────────────────────────────────────────────────┐
│                    Governance Subsystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │   API GW     │─────▶│ Policy Svc   │─────▶│    OPA     │ │
│  │  (Authz)     │      │  (Decision   │      │  (Engine)  │ │
│  └──────────────┘      │   Point)     │      └────────────┘ │
│         │              └──────────────┘             │        │
│         │                      │                    │        │
│         ▼                      ▼                    ▼        │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │  Approval    │      │   Policy     │      │   Audit    │ │
│  │  Workflow    │      │   Registry   │      │    Log     │ │
│  └──────────────┘      └──────────────┘      └────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Trust Boundaries:
═══════════════════════════════════════════════════════════════
  [External Users] ─────▶ [API Gateway] ─────▶ [Policy Services]
                    TB-1              TB-2

  [Policy Services] ─────▶ [OPA Engine] ─────▶ [Policy Data]
                    TB-3              TB-4

TB-1: Authentication boundary (OIDC/JWT)
TB-2: Service-to-service boundary (mTLS)
TB-3: Policy evaluation boundary (OPA interface)
TB-4: Policy storage boundary (Git/S3/database)
```

### Data Flow

1. **Authorization Request**: Client → API Gateway → Policy Service
2. **Policy Evaluation**: Policy Service → OPA → Policy Registry
3. **Approval Request**: User → Approval Workflow → Policy Service → OPA
4. **Policy Update**: Admin → Policy Registry → OPA (bundle refresh)
5. **Audit Trail**: All decisions → Audit Service → PostgreSQL

---

## Threat Analysis

### STRIDE Categories

| Category                   | Threat Count | Critical | High  | Medium | Low   |
| -------------------------- | ------------ | -------- | ----- | ------ | ----- |
| **Spoofing**               | 3            | 1        | 2     | 0      | 0     |
| **Tampering**              | 5            | 2        | 2     | 1      | 0     |
| **Repudiation**            | 3            | 1        | 1     | 1      | 0     |
| **Information Disclosure** | 3            | 0        | 2     | 1      | 0     |
| **Denial of Service**      | 3            | 1        | 1     | 1      | 0     |
| **Elevation of Privilege** | 3            | 2        | 1     | 0      | 0     |
| **Total**                  | **20**       | **7**    | **9** | **4**  | **0** |

---

## Detailed Threat Inventory

### Spoofing (S)

| ID       | Threat                               | Description                                                                            | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                      | Status  |
| -------- | ------------------------------------ | -------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **S-01** | Policy Service Identity Spoofing     | Attacker impersonates policy service to return forged authorization decisions          | 5      | 3          | 15 (High)     | Enforce mTLS between API GW and policy service; validate service certificates; implement service mesh (Istio/Linkerd)           | Partial |
| **S-02** | OPA Admin API Impersonation          | Attacker gains access to OPA admin API (`localhost:8181`) to inject malicious policies | 5      | 4          | 20 (Critical) | Disable OPA admin API in production; use bundle-only mode; require authentication for config API; network segmentation          | Partial |
| **S-03** | Approval Workflow Requester Spoofing | Attacker forges approval request as high-privilege user                                | 4      | 3          | 12 (High)     | Validate JWT claims against approval requester identity; implement approval request signing; audit all approval creation events | Partial |

---

### Tampering (T)

| ID       | Threat                             | Description                                                                                         | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                               | Status          |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **T-01** | Policy Bundle Tampering            | Unsigned or weakly signed OPA bundles allow policy injection                                        | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Enforce signed bundles in production; implement bundle signature verification; use immutable policy storage; enable OPA bundle signing with cosign/sigstore            | Not Implemented |
| **T-02** | Authorization Verdict Manipulation | Attacker modifies `allow: true/false` verdict in transit between OPA and API                        | 5      | 2          | 10 (High)     | Encrypt all service-to-service communication (TLS 1.3); implement verdict signing (JWT/JWS); use short-lived decision tokens; verify verdict integrity at enforcement point              | Partial         |
| **T-03** | Policy Version Rollback            | Attacker downgrades policy version to exploit fixed vulnerabilities                                 | 5      | 3          | 15 (Critical) | **CRITICAL GAP**: Implement monotonic policy versioning; prevent rollback without multi-party approval; audit all version changes; use blockchain/Merkle tree for version history        | Not Implemented |
| **T-04** | Approval State Manipulation        | Attacker directly modifies approval workflow state in database (e.g., `status: pending → approved`) | 4      | 3          | 12 (High)     | Implement state machine validation; use database triggers to prevent invalid transitions; audit all state changes; encrypt sensitive workflow data at rest                               | Partial         |
| **T-05** | Simulation Mode Abuse              | Attacker enables `simulation: true` flag in production to bypass enforcement                        | 4      | 4          | 16 (High)     | **CRITICAL GAP**: Disable simulation mode in production (env check); log all simulation requests; require elevated privileges for simulation; implement runtime configuration validation | Not Implemented |

---

### Repudiation (R)

| ID       | Threat                            | Description                                                                              | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                              | Status  |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **R-01** | Policy Decision Audit Bypass      | Attacker disables audit logging for authorization decisions                              | 5      | 3          | 15 (Critical) | Implement write-once audit logs; use separate audit database with restricted access; enable OPA decision logging plugin; send audit events to immutable SIEM            | Partial |
| **R-02** | Approval Action Repudiation       | Approver denies granting approval due to lack of cryptographic proof                     | 4      | 3          | 12 (High)     | Implement digital signatures on approval actions; use non-repudiation certificates; timestamp approvals with trusted time source; store signatures in provenance ledger | Partial |
| **R-03** | Policy Change Attribution Failure | Unable to determine who modified policy due to shared credentials or lack of Git signing | 3      | 4          | 12 (Medium)   | Require GPG-signed Git commits for policy changes; enforce individual credentials (no shared accounts); integrate with provenance ledger; audit Git push events         | Partial |

---

### Information Disclosure (I)

| ID       | Threat                            | Description                                                                                   | Impact | Likelihood | Risk Score  | Mitigation                                                                                                                                                               | Status      |
| -------- | --------------------------------- | --------------------------------------------------------------------------------------------- | ------ | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **I-01** | Verbose Policy Evaluation Leakage | OPA trace/explain mode exposes sensitive policy logic or data attributes in production logs   | 4      | 4          | 16 (High)   | Disable OPA explain mode in production; sanitize policy evaluation logs; implement log redaction for sensitive fields; use structured logging with classification labels | Partial     |
| **I-02** | Policy Bundle Exposure            | Unauthorized access to policy bundle storage (Git/S3) reveals authorization logic             | 4      | 3          | 12 (High)   | Encrypt policy bundles at rest; implement least-privilege access to policy storage; use private Git repositories with SSO; audit all policy bundle downloads             | Implemented |
| **I-03** | Approval Workflow Data Leakage    | Approval requests contain sensitive justification text or entity metadata logged in plaintext | 3      | 4          | 12 (Medium) | Encrypt approval workflow data in database; redact sensitive fields in logs; implement field-level encryption for PII; use data classification labels                    | Partial     |

---

### Denial of Service (D)

| ID       | Threat                     | Description                                                                               | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                              | Status  |
| -------- | -------------------------- | ----------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **D-01** | Policy Evaluation Storm    | Recursive or infinite loop in policy logic causes OPA to consume excessive CPU/memory     | 5      | 3          | 15 (Critical) | Implement OPA query timeouts; set memory/CPU limits (cgroups); use circuit breakers for policy service; monitor OPA resource usage; implement policy complexity analysis in CI          | Partial |
| **D-02** | Approval Workflow Flooding | Attacker creates thousands of approval requests to overwhelm approvers or exhaust storage | 3      | 4          | 12 (High)     | Implement rate limiting on approval creation (per user, per tenant); set maximum pending approvals; use priority queues; auto-expire stale requests; monitor workflow queue depth       | Partial |
| **D-03** | Policy Bundle Size Attack  | Malicious policy bundle exceeds size limits, causing OPA to crash or hang during load     | 3      | 2          | 6 (Medium)    | Enforce maximum bundle size (e.g., 10MB); validate bundle structure before deployment; implement bundle size monitoring; use staged policy rollout; test policies in canary environment | Partial |

---

### Elevation of Privilege (E)

| ID       | Threat                          | Description                                                                          | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                         | Status  |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------ | ------ | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **E-01** | Policy Bypass via Default Allow | Missing or misconfigured policy defaults to `allow: true` instead of deny-by-default | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Implement deny-by-default enforcement; require explicit allow rules; use policy linting (OPA conftest); test negative cases in CI; implement fail-closed mode                    | Partial |
| **E-02** | Approval Workflow Bypass        | Attacker directly calls protected API without going through approval workflow        | 5      | 3          | 15 (High)     | Enforce approval checks at API gateway layer; implement pre-authorization hooks; validate approval token on protected endpoints; use policy to require approval for sensitive operations           | Partial |
| **E-03** | OPA Policy Injection            | Attacker uploads malicious `.rego` policy through admin interface or CI/CD pipeline  | 4      | 3          | 12 (High)     | Implement policy review workflow (PR approval); run static analysis on policies (Rego linting); use policy simulation tests; restrict policy upload to authorized admins; audit all policy changes | Partial |

---

## Critical Gaps Summary

### 1. Simulation Mode in Production (T-05)

**Gap**: No runtime enforcement prevents `simulation: true` from being used in production environments.

**Risk**: Attackers can bypass authorization enforcement by setting simulation flag.

**Recommendation**:

```typescript
// Production guardrail in policy service
if (process.env.NODE_ENV === "production" && request.simulation === true) {
  throw new Error("Simulation mode disabled in production");
}

// Add to scripts/ci/prod-config-check.ts
if (config.policy?.allowSimulation !== false) {
  throw new Error("policy.allowSimulation must be false in production");
}
```

**Priority**: P0 (Block production deployment)

---

### 2. Policy Version Rollback (T-03)

**Gap**: Policy versioning system allows arbitrary rollback without approval or audit trail.

**Risk**: Attacker downgrades to vulnerable policy version to exploit fixed security issues.

**Recommendation**:

- Implement monotonic version counter (never decrease)
- Require multi-party approval for version changes
- Use Merkle tree or blockchain for tamper-evident version history
- Add policy version pinning in deployment manifests

```typescript
// Policy version validation
function validatePolicyVersion(currentVersion: number, newVersion: number) {
  if (newVersion < currentVersion) {
    throw new Error(`Policy rollback forbidden: ${currentVersion} → ${newVersion}`);
  }
  // Allow only if multi-party approval present
  if (newVersion !== currentVersion + 1) {
    requireApproval("policy:version:skip", { from: currentVersion, to: newVersion });
  }
}
```

**Priority**: P0 (Critical security control)

---

### 3. Unsigned Policy Bundles (T-01)

**Gap**: OPA bundle signing is optional, not enforced in production.

**Risk**: Tampered policies can be deployed without detection.

**Recommendation**:

```yaml
# OPA configuration (production)
bundles:
  authz:
    signing:
      keyid: "production-policy-key"
      scope: "write"
      exclude_files: []
    verification:
      keyid: "production-policy-key"
      scope: "read"

# Fail if signature verification fails
decision_logs:
  plugin: prometheus

# Production startup check
if [ "$NODE_ENV" = "production" ]; then
  if ! opa test --bundle --signing-key /etc/opa/keys/public.pem; then
    echo "ERROR: Unsigned bundle detected in production"
    exit 1
  fi
fi
```

**Priority**: P0 (Deploy blocker)

---

### 4. Default Allow Policies (E-01)

**Gap**: Some policy modules default to permissive behavior when rules are missing.

**Risk**: Unintended privilege escalation due to incomplete policy coverage.

**Recommendation**:

```rego
# Deny-by-default pattern
package authz

default allow = false  # ALWAYS explicit default

allow {
  # Explicit allow rules here
  input.user.role == "admin"
  input.action == "read"
}

# Test negative cases in CI
test_deny_by_default {
  not allow with input as {}
}
```

**Priority**: P0 (Security baseline)

---

### 5. Approval State Integrity (T-04)

**Gap**: Approval workflow state can be modified directly in database without validation.

**Risk**: Unauthorized approval escalation through database manipulation.

**Recommendation**:

```sql
-- PostgreSQL trigger for state validation
CREATE OR REPLACE FUNCTION validate_approval_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce state machine
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    RAISE EXCEPTION 'Cannot modify approved workflow';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- Require approver signature
    IF NEW.approver_signature IS NULL THEN
      RAISE EXCEPTION 'Approval requires digital signature';
    END IF;
  END IF;

  -- Audit all transitions
  INSERT INTO approval_audit_log (workflow_id, old_status, new_status, timestamp)
  VALUES (NEW.id, OLD.status, NEW.status, NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_state_validator
  BEFORE UPDATE ON approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION validate_approval_state_transition();
```

**Priority**: P1 (High impact)

---

## Remediation Roadmap

### Phase 1: Critical (0-30 days)

1. **Implement OPA bundle signing** (T-01)
   - Enable cosign/sigstore integration
   - Add production startup validation
   - Document key rotation procedure

2. **Disable simulation mode in production** (T-05)
   - Add runtime environment checks
   - Update CI/CD guardrails
   - Remove simulation code from production builds

3. **Enforce deny-by-default policies** (E-01)
   - Audit all policy modules for default behavior
   - Add negative test cases
   - Implement policy linting in CI

4. **Prevent policy version rollback** (T-03)
   - Implement monotonic versioning
   - Add multi-party approval workflow
   - Create version audit trail

### Phase 2: High Priority (30-60 days)

5. **Implement approval state integrity** (T-04)
   - Add database triggers for state validation
   - Implement digital signatures for approvals
   - Create approval audit log

6. **Encrypt authorization verdicts** (T-02)
   - Implement verdict signing (JWS)
   - Add TLS 1.3 enforcement
   - Create verdict verification at enforcement points

7. **Secure OPA admin API** (S-02)
   - Disable admin API in production
   - Implement bundle-only deployment
   - Network segmentation for OPA instances

8. **Implement policy decision auditing** (R-01)
   - Deploy immutable audit log storage
   - Enable OPA decision logging plugin
   - Integrate with SIEM

### Phase 3: Medium Priority (60-90 days)

9. **Sanitize policy evaluation logs** (I-01)
   - Implement log redaction
   - Disable explain mode in production
   - Add classification labels to logs

10. **Implement approval workflow security** (E-02, D-02, I-03)
    - Add approval token validation
    - Implement rate limiting
    - Encrypt workflow data at rest

11. **Add policy complexity analysis** (D-01)
    - Implement OPA query timeouts
    - Add resource limit monitoring
    - Create policy performance tests

12. **Secure policy storage** (I-02)
    - Encrypt policy bundles at rest
    - Implement least-privilege access
    - Audit policy bundle downloads

---

## Testing & Validation

### Security Test Cases

```typescript
// Test: Simulation mode blocked in production
describe("Governance Security", () => {
  it("should reject simulation mode in production", async () => {
    process.env.NODE_ENV = "production";

    await expect(
      policyService.evaluate({
        action: "read",
        resource: "entity/123",
        simulation: true,
      })
    ).rejects.toThrow("Simulation mode disabled in production");
  });

  // Test: Policy version rollback prevention
  it("should prevent policy version rollback", async () => {
    await policyRegistry.deploy({ version: 5 });

    await expect(policyRegistry.deploy({ version: 4 })).rejects.toThrow(
      "Policy rollback forbidden"
    );
  });

  // Test: Unsigned bundle rejection
  it("should reject unsigned policy bundles", async () => {
    const unsignedBundle = createBundle({ signed: false });

    await expect(opa.loadBundle(unsignedBundle)).rejects.toThrow(
      "Bundle signature verification failed"
    );
  });

  // Test: Deny-by-default enforcement
  it("should deny access when no policy matches", async () => {
    const result = await policyService.evaluate({
      action: "unknown",
      resource: "unknown",
    });

    expect(result.allow).toBe(false);
  });
});
```

---

## Monitoring & Detection

### Key Metrics

```yaml
# Prometheus alerts for governance threats

# Simulation mode abuse detection
- alert: SimulationModeInProduction
  expr: |
    sum(rate(policy_evaluation_simulation_total{env="production"}[5m])) > 0
  severity: critical

# Policy version rollback attempt
- alert: PolicyVersionRollback
  expr: |
    policy_version_current < policy_version_current offset 5m
  severity: critical

# Unsigned bundle deployment
- alert: UnsignedPolicyBundle
  expr: |
    opa_bundle_signature_verified == 0
  severity: critical

# Policy evaluation storm
- alert: PolicyEvaluationStorm
  expr: |
    rate(opa_policy_evaluation_duration_seconds_count[1m]) > 1000
  severity: warning

# Approval workflow flooding
- alert: ApprovalFlood
  expr: |
    rate(approval_workflow_created_total[5m]) > 50
  severity: warning
```

---

## References

- **OPA Security Best Practices**: https://www.openpolicyagent.org/docs/latest/security/
- **Bundle Signing**: https://www.openpolicyagent.org/docs/latest/management-bundles/#signing
- **NIST SP 800-95**: Guide to Secure Web Services
- **OWASP API Security Top 10**: https://owasp.org/www-project-api-security/

---

## Document Control

**Change Log**:

| Version | Date       | Author        | Changes                       |
| ------- | ---------- | ------------- | ----------------------------- |
| 1.0     | 2025-12-27 | Security Team | Initial threat model creation |

**Approval**:

- [ ] Security Architect
- [ ] Engineering Lead
- [ ] Compliance Officer

**Next Review**: 2026-03-27
