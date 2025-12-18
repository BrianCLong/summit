# Risk & Ethics Memo v0

## Sprint N "Provable Value Slice"

**Document Version:** 1.0.0
**Date:** November 28, 2025
**Authors:** Engineering & GRC Team
**Classification:** Internal

---

## 1. Executive Summary

This memo documents the risk assessment and ethical considerations for the "Provable Value Slice" sprint deliverables. The sprint introduces AI-augmented decision-making capabilities with full provenance tracking, designed for design partner demonstrations.

### Scope

The following components are covered:
- IntelGraph decision provenance schema and APIs
- Maestro decision run orchestration
- Disclosure pack generation
- Claims and evidence management

---

## 2. Context

### 2.1 What This Value Slice Does

The system enables users to:
1. Create structured decisions with supporting claims and evidence
2. Run AI-augmented analysis to generate recommendations
3. Track full provenance of how decisions were made
4. Generate audit-ready disclosure packs for compliance

### 2.2 Target Use Cases

- **Vendor Risk Decisions**: Evaluate vendor security and compliance
- **Model Selection**: Choose AI/ML models for internal deployment
- **Resource Allocation**: Allocate resources based on evidence

### 2.3 Current Maturity Level

**MVP / Design Partner Demo** - Not production-ready

---

## 3. Risk Assessment

### 3.1 Data Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sensitive data in claims/evidence | High | High | Policy labels, clearance checks, redaction in disclosure packs |
| PII exposure in exports | Medium | High | Automatic redaction for non-cleared users, audit logging |
| Data staleness leading to wrong decisions | Medium | Medium | Evidence freshness tracking, expiry dates, warnings in UI |
| Hash collision (theoretical) | Very Low | Medium | SHA-256 provides sufficient collision resistance |

### 3.2 Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unauthorized access to decisions | Medium | High | RBAC/ABAC with OPA, tenant isolation |
| Tampering with claims/evidence | Low | Critical | Content hashing, Merkle trees, provenance chain |
| Token/credential exposure | Low | Critical | JWT validation, secret rotation, no default secrets in prod |
| API abuse/DoS | Medium | Medium | Rate limiting, budget controls on Maestro runs |

### 3.3 AI/ML Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hallucination in recommendations | Medium | High | Confidence scoring, mandatory human approval for low confidence |
| Bias in AI outputs | Medium | Medium | Diverse evidence requirements, human review, audit trail |
| Over-reliance on AI recommendations | Medium | High | "AI-assisted" framing, human-in-the-loop approvals |
| Model version drift | Low | Medium | Model version tracking in run metadata |

### 3.4 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Audit trail gaps | Low | High | Automatic provenance triggers, audit middleware |
| Disclosure pack tampering | Low | High | Merkle root verification, optional signatures |
| Orphaned data (claims without evidence) | Medium | Low | Validation warnings, graph integrity checks |

---

## 4. Ethical Considerations

### 4.1 Human Agency & Oversight

**Principle:** Humans must remain in control of consequential decisions.

**Implementation:**
- All high-impact decisions require human approval
- AI recommendations include explicit confidence scores
- Approval chain tracks who made the final call
- Low-confidence decisions require multiple approvers

### 4.2 Transparency & Explainability

**Principle:** Users must understand how recommendations were generated.

**Implementation:**
- Full provenance chain from evidence → claims → decision
- Disclosure packs document all inputs and reasoning
- AI rationale included in decision records
- Known limitations explicitly listed

### 4.3 Fairness & Non-Discrimination

**Principle:** Decisions should not perpetuate unfair bias.

**Implementation:**
- Multiple evidence sources required for high-confidence claims
- Human reviewers can flag biased recommendations
- Audit trail enables retrospective bias analysis
- Contradicting claims explicitly tracked

### 4.4 Privacy & Data Protection

**Principle:** Personal and sensitive data must be protected.

**Implementation:**
- Policy labels for sensitivity classification
- Clearance-based access control
- Automatic redaction in exports
- PII markers on evidence

### 4.5 Accountability

**Principle:** Clear responsibility for decisions and their outcomes.

**Implementation:**
- Immutable audit log of all actions
- Decision maker explicitly recorded
- Approval chain with timestamps
- Provenance events cannot be deleted

---

## 5. One-Way vs Two-Way Decisions

### 5.1 Two-Way Decisions (Reversible)

These decisions can be undone with minimal cost:
- Draft decisions (can be modified/deleted)
- Pending approval decisions (can be rejected)
- Resource allocation changes (can be reallocated)

**Recommendation:** Allow faster decision-making for reversible decisions.

### 5.2 One-Way Decisions (Irreversible or High-Cost)

These decisions are difficult or impossible to reverse:
- Vendor contract terminations
- Personnel actions based on assessments
- Public disclosures
- Regulatory submissions

**Recommendation:** Require additional scrutiny:
- Multiple approvers
- Mandatory waiting period
- Explicit acknowledgment of irreversibility
- Higher confidence threshold

---

## 6. Compensating Controls

Given the current MVP maturity level, the following compensating controls are in place:

### 6.1 Technical Controls

1. **Logging**: All API calls logged with full context
2. **Immutability**: Provenance events append-only
3. **Hashing**: Content integrity verification
4. **Isolation**: Tenant-level data separation
5. **Authentication**: JWT with role claims

### 6.2 Process Controls

1. **Human Review**: Required for all production decisions
2. **Design Partner Scope**: Limited to controlled demonstrations
3. **Canary Usage**: New features tested on synthetic data first
4. **Incident Response**: Documented runbook for data exposure

### 6.3 Organizational Controls

1. **Access Reviews**: Quarterly access audit
2. **Training**: User training on decision system limitations
3. **Escalation Path**: Clear escalation for disputed decisions
4. **Ethics Review**: Quarterly review of AI recommendations

---

## 7. Compliance Mapping

### 7.1 SOC2 Trust Services Criteria (Relevant Subset)

| Control | TSC | Status | Notes |
|---------|-----|--------|-------|
| Access Control | CC6.1 | Partial | RBAC implemented, need access reviews |
| Change Management | CC8.1 | Partial | Git-based, need formal change board |
| Risk Assessment | CC3.1 | In Progress | This document |
| Monitoring | CC7.2 | Partial | Audit logs, need alerting |
| Incident Response | CC7.3 | Gap | Need documented runbook |
| Data Integrity | PI1.3 | Implemented | Hashing, provenance |

### 7.2 NIST AI RMF Alignment

| Function | Category | Status |
|----------|----------|--------|
| Govern | Accountability | Partial - need formal RACI |
| Map | Context | Implemented - use case documentation |
| Measure | Performance | Gap - need metrics dashboard |
| Manage | Risk Treatment | Partial - this document |

---

## 8. Recommendations

### 8.1 Immediate (Before Demo)

1. ✅ Implement audit logging (done)
2. ✅ Add confidence thresholds (done)
3. ✅ Create disclosure pack generator (done)
4. ⬜ Add rate limiting to APIs
5. ⬜ Document incident response runbook

### 8.2 Short-Term (Next 30 Days)

1. Implement automated bias detection in AI outputs
2. Add evidence source diversity scoring
3. Create decision quality metrics dashboard
4. Conduct tabletop exercise for data breach scenario

### 8.3 Medium-Term (Next Quarter)

1. External security assessment
2. SOC2 Type I readiness review
3. AI ethics review board establishment
4. Customer-facing transparency report template

---

## 9. Acceptance Criteria

This Risk & Ethics Memo is accepted when:

- [ ] Reviewed by Engineering Lead
- [ ] Reviewed by Security/GRC
- [ ] Reviewed by Product Owner
- [ ] Compensating controls verified
- [ ] Stored in version control

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-28 | Engineering | Initial version |

---

## Appendix A: Glossary

- **Claim**: An assertion about an entity with confidence scoring
- **Evidence**: Source material supporting a claim
- **Decision**: A recorded choice with full provenance
- **Disclosure Pack**: Audit-ready export of decision documentation
- **Provenance**: Chain of custody for data and decisions
- **Maestro**: Workflow orchestration engine

## Appendix B: Related Documents

- [Architecture Decision Records](../ADR/)
- [Security Policy](../../SECURITY/)
- [Data Classification Policy](../../infrastructure/opa/policies/data_classification.rego)
- [RBAC Policy](../../infrastructure/opa/policies/rbac.rego)
