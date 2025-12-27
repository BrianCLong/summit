# Threat Model: Governance Subsystem

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **Status**: Production
> **Owner**: Security Architecture Team
> **SOC 2 Controls**: CC6.1, CC6.2, CC7.1, CC7.2, PI1.1

## 1. System Overview

The Governance Subsystem is responsible for policy-driven access control, provenance tracking, and compliance enforcement across the IntelGraph platform.

### Components

- **Policy Engine (OPA)**: Evaluates access policies
- **Attestation Verifier**: Verifies data provenance
- **Approval Workflow Engine**: Manages human-in-the-loop approvals
- **Audit Service**: Records governance decisions
- **GA Enforcement Service**: Ensures mandatory governance on all outputs

### Data Assets

- Policy bundles (Rego files)
- Governance verdicts
- Audit logs (immutable)
- Provenance chains
- Approval workflows

---

## 2. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  BOUNDARY 1: External → API Gateway                         │
│  - All external requests                                     │
│  - Untrusted input                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  BOUNDARY 2: API Gateway → Governance Layer                  │
│  - Authenticated but not authorized                          │
│  - JWT validated but not role-checked                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  BOUNDARY 3: Governance → Application Services               │
│  - Policy evaluation completed                               │
│  - Governance verdict attached                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Threat Catalog

### THREAT-GOV-001: Policy Bypass via Missing Verdict

**Description**: Attacker attempts to access data without governance evaluation by exploiting code paths that don't enforce GovernanceVerdict.

**STRIDE Category**: Elevation of Privilege

**Risk Level**: CRITICAL

**Attack Vector**:

1. Identify API endpoints that return data
2. Find endpoints without governance middleware
3. Access data directly, bypassing policy checks

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Type System Enforcement | GovernanceVerdict is mandatory in DataEnvelope | ✅ Implemented |
| Compile-Time Checks | TypeScript strict mode prevents optional verdict | ✅ Implemented |
| Runtime Validation | validateDataEnvelope() checks verdict presence | ✅ Implemented |
| CI Gate | Governance bypass tests run on every PR | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-GOV-002: Verdict Tampering

**Description**: Attacker modifies governance verdict after creation to change DENY to ALLOW.

**STRIDE Category**: Tampering

**Risk Level**: HIGH

**Attack Vector**:

1. Intercept response before client receives it
2. Modify verdict.result from 'DENY' to 'ALLOW'
3. Use modified response to access data

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Immutable Verdicts | Object.freeze() on verdict creation | ⚠️ Planned |
| Cryptographic Signing | Sign verdicts with HMAC | ⚠️ Planned |
| Server-Side Verification | Re-verify verdict on sensitive operations | ✅ Implemented |
| Audit Logging | Log all verdict modifications | ✅ Implemented |

**Residual Risk**: MEDIUM (until signing implemented)

---

### THREAT-GOV-003: Policy Bundle Injection

**Description**: Attacker injects malicious policy bundles to override access controls.

**STRIDE Category**: Tampering, Elevation of Privilege

**Risk Level**: CRITICAL

**Attack Vector**:

1. Compromise policy bundle storage
2. Upload malicious Rego policy that allows all access
3. Wait for OPA to refresh bundle
4. All requests now ALLOWED

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Bundle Signing | Cosign-based signature verification | ✅ Implemented |
| GitOps Workflow | All policy changes require PR review | ✅ Implemented |
| Bundle Hash Verification | Verify SHA-256 on bundle fetch | ✅ Implemented |
| Version Pinning | Lock to specific bundle versions in prod | ✅ Implemented |
| Audit Trail | Log all bundle changes | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-GOV-004: Provenance Chain Manipulation

**Description**: Attacker manipulates provenance chain to hide data origin or fabricate lineage.

**STRIDE Category**: Tampering, Repudiation

**Risk Level**: HIGH

**Attack Vector**:

1. Access provenance ledger
2. Insert fake lineage nodes
3. Create false audit trail
4. Claim data came from trusted source

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Append-Only Storage | Provenance ledger is immutable | ✅ Implemented |
| Merkle Tree Verification | Verify chain integrity via merkle proofs | ✅ Implemented |
| Hash Chaining | Each lineage node references parent hash | ✅ Implemented |
| Timestamp Authority | Use trusted timestamp service | ⚠️ Planned |

**Residual Risk**: MEDIUM (until timestamp authority)

---

### THREAT-GOV-005: Audit Log Deletion

**Description**: Attacker attempts to delete audit logs to hide malicious activity.

**STRIDE Category**: Repudiation

**Risk Level**: CRITICAL

**Attack Vector**:

1. Gain database admin access
2. Execute DELETE on audit_events table
3. Cover tracks of unauthorized access

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Database Trigger | Prevent DELETE/UPDATE on audit tables | ✅ Implemented |
| Separate Credentials | Audit DB uses read-only app credentials | ✅ Implemented |
| Off-Site Replication | Real-time replication to separate region | ✅ Implemented |
| Immutable Backup | Write-once backup to S3 Glacier | ✅ Implemented |
| Log Monitoring | Alert on any DELETE attempts | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-GOV-006: Evaluator Spoofing

**Description**: Attacker spoofs the evaluator field to impersonate trusted policy engine.

**STRIDE Category**: Spoofing

**Risk Level**: MEDIUM

**Attack Vector**:

1. Create verdict with evaluator = "opa-engine"
2. Inject verdict without actual OPA evaluation
3. Bypass policy checks

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Trusted Evaluator List | Validate evaluator against allowlist | ✅ Implemented |
| Service Identity | mTLS between services | ✅ Implemented |
| Verdict Source Validation | Check verdict origin via correlation ID | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-GOV-007: Approval Workflow Bypass

**Description**: Attacker bypasses human approval requirements for sensitive operations.

**STRIDE Category**: Elevation of Privilege

**Risk Level**: HIGH

**Attack Vector**:

1. Identify high-risk operation requiring approval
2. Manipulate workflow state directly
3. Set status to APPROVED without actual approval
4. Execute sensitive operation

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| State Machine Validation | XState enforces valid transitions | ✅ Implemented |
| Dual Control | Require 2+ approvers for high-risk ops | ✅ Implemented |
| Timeout Enforcement | Default to DENY on timeout | ✅ Implemented |
| Approval Signatures | Digital signature on approval | ⚠️ Planned |

**Residual Risk**: MEDIUM (until signatures)

---

### THREAT-GOV-008: Denial of Service via Policy Complexity

**Description**: Attacker crafts complex policies or inputs to exhaust policy engine resources.

**STRIDE Category**: Denial of Service

**Risk Level**: MEDIUM

**Attack Vector**:

1. Submit policy evaluation request
2. Include deeply nested input structure
3. Cause OPA to consume excessive memory/CPU
4. Degrade service for other users

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Input Size Limits | Max 1MB for policy input | ✅ Implemented |
| Evaluation Timeout | 100ms timeout on policy eval | ✅ Implemented |
| Query Complexity Limits | Limit Rego recursion depth | ✅ Implemented |
| Rate Limiting | Per-tenant evaluation limits | ✅ Implemented |
| Circuit Breaker | Fail-fast on repeated timeouts | ✅ Implemented |

**Residual Risk**: LOW

---

## 4. Security Controls Summary

| Control Category | Implemented | Planned | Total  |
| ---------------- | ----------- | ------- | ------ |
| Authentication   | 4           | 0       | 4      |
| Authorization    | 6           | 1       | 7      |
| Data Integrity   | 5           | 2       | 7      |
| Audit & Logging  | 5           | 0       | 5      |
| Availability     | 5           | 0       | 5      |
| **TOTAL**        | **25**      | **3**   | **28** |

---

## 5. Risk Assessment Matrix

| Threat ID | Severity | Likelihood | Impact   | Risk Score | Status    |
| --------- | -------- | ---------- | -------- | ---------- | --------- |
| GOV-001   | Critical | Low        | Critical | LOW        | Mitigated |
| GOV-002   | High     | Medium     | High     | MEDIUM     | Partial   |
| GOV-003   | Critical | Low        | Critical | LOW        | Mitigated |
| GOV-004   | High     | Low        | High     | MEDIUM     | Partial   |
| GOV-005   | Critical | Very Low   | Critical | LOW        | Mitigated |
| GOV-006   | Medium   | Low        | Medium   | LOW        | Mitigated |
| GOV-007   | High     | Medium     | High     | MEDIUM     | Partial   |
| GOV-008   | Medium   | Medium     | Low      | LOW        | Mitigated |

---

## 6. Residual Risk Acceptance

**Overall Residual Risk**: MEDIUM

**Accepted Risks**:

1. Verdict tampering via memory manipulation (requires memory access)
2. Timestamp manipulation before timestamp authority implementation

**Risk Owner**: CISO

**Next Review**: 2026-03-27

---

## 7. References

- [ARCHITECTURE.md](../docs/ga/ARCHITECTURE.md)
- [TRUST-BOUNDARIES.md](../docs/ga/TRUST-BOUNDARIES.md)
- [SOC 2 Control Mapping](../audit/ga-evidence/governance/soc2-control-mapping.md)
