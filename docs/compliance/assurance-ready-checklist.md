# Assurance-Ready Checklist

> **Purpose**: A control is "assurance-ready" when it can satisfy auditor inquiries and customer evidence requests through automated, verifiable means—not bespoke spreadsheets.

---

## Quick Reference: Control Readiness Criteria

A control is assurance-ready if **ALL** of the following are true:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Documented** | Control has a written description in the control catalog |
| 2 | **Mapped** | Control is mapped to at least one compliance framework |
| 3 | **Implemented** | Technical implementation exists and is referenced |
| 4 | **Evidence Sources Defined** | At least one automated evidence source is configured |
| 5 | **Tests Defined** | At least one automated test validates control effectiveness |
| 6 | **Tests Passing** | Most recent test execution passed |
| 7 | **Evidence Fresh** | Evidence is within staleness threshold |
| 8 | **Owner Assigned** | Control has a designated owner |
| 9 | **Reviewed** | Control was reviewed within the review cycle |

---

## Detailed Checklist

### 1. Documentation Requirements

- [ ] **Control Description**
  - Clear, concise description of what the control does
  - Written for both technical and non-technical audiences
  - Explains the security objective being achieved

- [ ] **Implementation Details**
  - Technical components involved (services, configs, policies)
  - File paths to relevant code/configuration
  - Architecture diagrams where applicable

- [ ] **Operational Procedures**
  - How the control operates day-to-day
  - Manual procedures (if any) are documented
  - Exception handling process defined

### 2. Framework Mapping Requirements

- [ ] **Primary Framework Mapping**
  - Control mapped to primary compliance framework (e.g., SOC 2)
  - Specific control ID referenced (e.g., CC6.1)
  - Mapping confidence level indicated (exact/partial/related)

- [ ] **Cross-Framework Mappings**
  - Mapped to additional relevant frameworks
  - Common mappings: SOC 2, ISO 27001, NIST 800-53, HIPAA
  - Mapping rationale documented for partial/related mappings

- [ ] **Requirement Text**
  - Actual requirement text from framework included
  - Interpretation notes where framework language is ambiguous

### 3. Implementation Requirements

- [ ] **Technical Controls**
  - Implementation exists in codebase
  - Code paths documented and verifiable
  - No "planned" or "TODO" implementations

- [ ] **Configuration**
  - Required configurations are in place
  - Configurations are version controlled
  - No manual/ad-hoc configurations outside IaC

- [ ] **Integration**
  - Control is integrated into operational systems
  - Not a standalone/isolated component
  - Properly wired into authentication, authorization, audit systems

### 4. Evidence Source Requirements

- [ ] **Automated Collection**
  - At least one evidence source is automated
  - Evidence collected without manual intervention
  - Collection process is reliable and monitored

- [ ] **Source Configuration**
  ```yaml
  # Example evidence source configuration
  evidenceSource:
    id: "access-audit-logs"
    type: "audit_log"
    table: "audit_events"
    query: "SELECT * FROM audit_events WHERE..."
    fields: ["event_type", "actor_id", "outcome", "timestamp"]
    retentionPeriod: "7y"
    refreshFrequency: "continuous"
    stalenessThreshold: "1h"
  ```

- [ ] **Multiple Source Types**
  - Audit logs (primary evidence)
  - Configuration snapshots
  - Metrics/monitoring data
  - Policy definitions

- [ ] **Retention Compliance**
  - Evidence retained for required period (typically 7 years)
  - Retention is automated, not manual
  - Deletion is controlled and audited

### 5. Test Definition Requirements

- [ ] **Automated Tests**
  - At least one automated test exists
  - Test script is version controlled
  - Test can run without manual intervention

- [ ] **Test Coverage**
  ```yaml
  # Example test configuration
  test:
    id: "ACCESS-001-T01"
    name: "Authentication Required"
    type: "automated"
    frequency: "continuous"
    script: "tests/compliance/access-auth-required.test.ts"
    schedule: "0 */4 * * *"
    expectedResult: "All protected endpoints return 401 without valid auth"
  ```

- [ ] **Test Frequency**
  - Continuous tests for critical controls
  - Daily tests for standard controls
  - At minimum quarterly for all controls

- [ ] **Expected Results**
  - Clear pass/fail criteria defined
  - No ambiguous or subjective assessments
  - Results are machine-verifiable

### 6. Test Execution Requirements

- [ ] **Recent Execution**
  - Test was executed within frequency period
  - Last execution timestamp recorded
  - Next execution scheduled

- [ ] **Passing Status**
  - Most recent execution passed
  - If failed, remediation is in progress
  - Failure history is tracked

- [ ] **Result Recording**
  - Test results stored in audit system
  - Results include execution details
  - Evidence artifacts captured

### 7. Evidence Freshness Requirements

- [ ] **Within Threshold**
  - Evidence age < staleness threshold
  - Staleness thresholds per evidence type:
    | Type | Threshold |
    |------|-----------|
    | Audit logs | 1 hour |
    | Configuration | 24 hours |
    | Metrics | 5 minutes |
    | Certifications | 30 days before expiry |
    | Access reviews | 90 days |

- [ ] **Refresh Automation**
  - Evidence refresh is automated
  - Refresh schedule is defined
  - Refresh failures are alerted

- [ ] **Integrity Verification**
  - Evidence has integrity hash
  - Hash is verified on retrieval
  - Tampering is detectable

### 8. Ownership Requirements

- [ ] **Designated Owner**
  - Specific team or individual assigned
  - Owner has authority to make changes
  - Owner is accountable for control effectiveness

- [ ] **Contact Information**
  - Owner email/contact documented
  - Escalation path defined
  - Backup owner identified

- [ ] **Reviewer Assignment**
  - At least one reviewer assigned
  - Reviewer is independent of owner
  - Review responsibilities defined

### 9. Review Requirements

- [ ] **Review Cycle Compliance**
  - Control reviewed within cycle period:
    | Control Risk | Review Cycle |
    |--------------|--------------|
    | Critical | Quarterly |
    | High | Semi-annual |
    | Medium | Annual |
    | Low | Biennial |

- [ ] **Review Documentation**
  - Review date recorded
  - Reviewer identity recorded
  - Review findings documented

- [ ] **Issue Tracking**
  - Open issues tracked
  - Remediation plans documented
  - Target dates assigned

---

## Control Readiness Assessment Template

Use this template to assess a control's readiness:

```yaml
controlAssessment:
  controlId: "ACCESS-001"
  controlTitle: "Logical Access Control"
  assessmentDate: "2025-12-07"
  assessor: "compliance-team"

  criteria:
    documented:
      status: "met"  # met | partial | not_met | n/a
      evidence: "Control description in /docs/compliance/..."
      notes: ""

    frameworkMapped:
      status: "met"
      evidence: "Mapped to SOC2 CC6.1, ISO A.9.4.1, NIST AC-3"
      notes: ""

    implemented:
      status: "met"
      evidence: "OPA policies at /SECURITY/policy/opa/"
      notes: ""

    evidenceSourcesDefined:
      status: "met"
      evidence: "4 evidence sources configured"
      notes: "Audit logs, OPA policies, IdP config, metrics"

    testsDefined:
      status: "met"
      evidence: "5 tests defined, 4 automated"
      notes: "Quarterly access review is manual"

    testsPassing:
      status: "met"
      evidence: "Last run: 2025-12-07T02:00:00Z - PASSED"
      notes: ""

    evidenceFresh:
      status: "met"
      evidence: "All evidence within staleness thresholds"
      notes: ""

    ownerAssigned:
      status: "met"
      evidence: "Security Team (security@company.io)"
      notes: ""

    reviewed:
      status: "met"
      evidence: "Last review: 2025-10-15"
      notes: "Next review due: 2026-01-15"

  overallStatus: "ready"  # ready | partial | not_ready

  recommendations: []

  blockers: []
```

---

## Checklist by Control Category

### Access Control (CC6.x, A.9.x)

- [ ] Authentication mechanism documented
- [ ] Authorization model documented (RBAC/ABAC)
- [ ] MFA requirements defined and enforced
- [ ] Session management controls in place
- [ ] Privileged access restrictions defined
- [ ] Access provisioning/deprovisioning process automated
- [ ] Access review process scheduled
- [ ] Authentication logs available for 7 years
- [ ] Failed login alerting configured

### Data Protection (CC6.7, A.10.x)

- [ ] Encryption at rest documented
- [ ] Encryption in transit documented
- [ ] Key management process defined
- [ ] Key rotation automated
- [ ] Data classification scheme defined
- [ ] DLP controls documented (if applicable)
- [ ] Encryption evidence collection automated

### Change Management (CC8.x, A.12.1.2)

- [ ] Change process documented
- [ ] Pull request workflow enforced
- [ ] Code review requirements defined
- [ ] CI/CD pipeline documented
- [ ] Deployment audit trail complete
- [ ] Rollback capability documented
- [ ] Emergency change process defined
- [ ] Change logs available for 7 years

### Availability (A1.x, A.17.x)

- [ ] Backup procedures documented
- [ ] Recovery objectives defined (RTO/RPO)
- [ ] Backup automation in place
- [ ] Recovery testing schedule defined
- [ ] Recovery test results available
- [ ] Replication/redundancy documented
- [ ] Capacity planning documented

### Monitoring & Incident Response (CC7.x, A.16.x)

- [ ] Monitoring coverage documented
- [ ] Alerting thresholds defined
- [ ] Incident response plan documented
- [ ] Incident classification defined
- [ ] Escalation procedures documented
- [ ] Incident log retention configured
- [ ] Post-incident review process defined

---

## Remediation Priorities

When a control is not assurance-ready, prioritize remediation:

| Priority | Condition | Action |
|----------|-----------|--------|
| **P0 - Critical** | Control not implemented | Implement immediately |
| **P1 - High** | Tests failing | Fix and verify within 48 hours |
| **P2 - Medium** | Evidence stale | Restore collection within 1 week |
| **P3 - Low** | Documentation incomplete | Complete within 30 days |

---

## Automation Requirements

### Evidence Collection Automation

```typescript
// Example: Automated evidence collection job
interface EvidenceCollectionJob {
  controlId: string;
  sources: EvidenceSource[];
  schedule: string;  // Cron expression
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  alertOnFailure: boolean;
}
```

### Test Automation

```typescript
// Example: Automated compliance test
interface ComplianceTest {
  testId: string;
  controlId: string;
  script: string;
  schedule: string;
  timeout: number;
  expectedResult: string;
  onFailure: 'alert' | 'alert_and_block' | 'log';
}
```

### Reporting Automation

```typescript
// Example: Automated compliance report
interface ComplianceReport {
  framework: ComplianceFramework;
  schedule: string;  // "monthly" | "quarterly"
  recipients: string[];
  format: 'pdf' | 'json' | 'csv';
  includeEvidence: boolean;
}
```

---

## Appendix: Framework-Specific Requirements

### SOC 2 Type II

- Evidence must cover the entire audit period (typically 12 months)
- Controls must be operating effectively, not just designed
- Population and sampling evidence required for key controls
- Exception tracking and resolution documented

### ISO 27001

- Statement of Applicability (SoA) required
- Risk assessment linked to controls
- Management review evidence required
- Continuous improvement evidence required

### HIPAA

- BAA requirements documented
- PHI handling controls documented
- Workforce training evidence required
- Breach notification process documented

### FedRAMP

- System Security Plan (SSP) required
- Continuous monitoring evidence required
- POA&M tracking required
- Annual assessment evidence required

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-07 | Initial release |
