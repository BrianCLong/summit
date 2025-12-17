# Analytics Workspace Compliance Checklist

> **Version**: 1.0.0
> **Last Updated**: 2025-12-07
> **Owner**: Data Governance Team

## Overview

This checklist defines the compliance requirements for analytics workspaces in the Safe Analytics Workbench. A workspace is considered **compliant** if it meets all REQUIRED items and at least 80% of RECOMMENDED items.

Use this checklist when:
- Creating a new analytics workspace
- Conducting periodic compliance reviews
- Auditing workspace configurations
- Preparing for external audits

---

## Compliance Tiers

| Tier | Requirements | Review Frequency |
|------|-------------|------------------|
| **Standard** | All REQUIRED items | Quarterly |
| **Enhanced** | All REQUIRED + 80% RECOMMENDED | Monthly |
| **Restricted** | All items including RESTRICTED | Weekly |

---

## Checklist Categories

### 1. Access Control

#### REQUIRED

- [ ] **1.1** Workspace has a designated owner with valid corporate identity
- [ ] **1.2** All collaborators have justified business need documented
- [ ] **1.3** Collaborator permissions follow least-privilege principle
- [ ] **1.4** No shared/service accounts used for interactive access
- [ ] **1.5** Multi-factor authentication enabled for all users
- [ ] **1.6** Access reviewed and re-certified within last 90 days

#### RECOMMENDED

- [ ] **1.7** Role-based access control (RBAC) aligned with job functions
- [ ] **1.8** Automated access expiration for temporary collaborators
- [ ] **1.9** Access provisioning/deprovisioning integrated with HR systems
- [ ] **1.10** Privileged access (ENGINEER role) requires additional approval

#### RESTRICTED DATA ONLY

- [ ] **1.11** Background check completed for all users with access
- [ ] **1.12** Signed data handling agreement on file
- [ ] **1.13** Dedicated security training completed within last 12 months

---

### 2. Data Governance

#### REQUIRED

- [ ] **2.1** All datasets have documented data classification
- [ ] **2.2** Data lineage traceable from source to workspace
- [ ] **2.3** No raw PII accessed without explicit approval
- [ ] **2.4** Data masking applied to sensitive columns per policy
- [ ] **2.5** Row-level filtering enforced where applicable
- [ ] **2.6** Data retention aligned with organizational policy

#### RECOMMENDED

- [ ] **2.7** Data quality checks run on ingested data
- [ ] **2.8** Schema documentation up to date
- [ ] **2.9** Data dictionary available for all datasets
- [ ] **2.10** Automated PII detection enabled
- [ ] **2.11** Data profiling completed for new datasets

#### RESTRICTED DATA ONLY

- [ ] **2.12** Encryption at rest enabled (AES-256)
- [ ] **2.13** Column-level encryption for highly sensitive fields
- [ ] **2.14** Data minimization review completed
- [ ] **2.15** Cross-border data transfer assessment completed (if applicable)

---

### 3. Audit & Logging

#### REQUIRED

- [ ] **3.1** All queries logged with user identity
- [ ] **3.2** All exports logged with manifest
- [ ] **3.3** Audit logs retained for minimum 7 years
- [ ] **3.4** Audit logs tamper-evident (immutable storage)
- [ ] **3.5** Failed access attempts logged and alerted
- [ ] **3.6** Reason-for-access captured for sensitive data queries

#### RECOMMENDED

- [ ] **3.7** Query text sanitized (literals removed) before logging
- [ ] **3.8** Audit log anomaly detection enabled
- [ ] **3.9** Regular audit log review (at least monthly)
- [ ] **3.10** Audit reports generated for stakeholders
- [ ] **3.11** Integration with SIEM for security monitoring

#### RESTRICTED DATA ONLY

- [ ] **3.12** Real-time alerting on sensitive data access
- [ ] **3.13** Screen recording enabled for highly sensitive operations
- [ ] **3.14** Dual-person integrity for bulk operations

---

### 4. Export & Egress Controls

#### REQUIRED

- [ ] **4.1** Export limits configured per user role
- [ ] **4.2** Bulk exports (>1000 rows) require approval
- [ ] **4.3** PII exports blocked or require explicit approval
- [ ] **4.4** Export destinations restricted to approved locations
- [ ] **4.5** Export watermarking enabled
- [ ] **4.6** Daily export quotas enforced

#### RECOMMENDED

- [ ] **4.7** Automatic PII detection on export
- [ ] **4.8** Export format restrictions by data classification
- [ ] **4.9** Export expiration (time-limited download links)
- [ ] **4.10** Export notification to data owners
- [ ] **4.11** DLP integration for content inspection

#### RESTRICTED DATA ONLY

- [ ] **4.12** All exports require dual approval
- [ ] **4.13** Exports to external destinations blocked
- [ ] **4.14** Physical media export prohibited
- [ ] **4.15** Export audit trail reviewed within 24 hours

---

### 5. Sandbox & Resource Controls

#### REQUIRED

- [ ] **5.1** Workspace runs in isolated container/namespace
- [ ] **5.2** Network egress restricted to approved endpoints
- [ ] **5.3** Resource quotas (CPU, memory, storage) enforced
- [ ] **5.4** Query timeout limits configured
- [ ] **5.5** No root/admin privileges in sandbox environment
- [ ] **5.6** Sandbox image from approved registry only

#### RECOMMENDED

- [ ] **5.7** Read-only root filesystem
- [ ] **5.8** Dropped Linux capabilities (CAP_DROP ALL)
- [ ] **5.9** Seccomp profile applied
- [ ] **5.10** Resource usage monitoring and alerting
- [ ] **5.11** Automatic scaling within quota limits

#### RESTRICTED DATA ONLY

- [ ] **5.12** Air-gapped network (no internet access)
- [ ] **5.13** Dedicated compute nodes (no multi-tenancy)
- [ ] **5.14** Memory encryption enabled
- [ ] **5.15** Ephemeral storage only (no persistent volumes)

---

### 6. Lifecycle Management

#### REQUIRED

- [ ] **6.1** Workspace expiration date configured
- [ ] **6.2** Idle detection and automatic suspension enabled
- [ ] **6.3** Archived workspaces retain audit trail
- [ ] **6.4** Deletion requires dual approval
- [ ] **6.5** Workspace renewal requires re-justification
- [ ] **6.6** Orphaned workspaces (owner departed) flagged for review

#### RECOMMENDED

- [ ] **6.7** Automatic extension based on documented criteria
- [ ] **6.8** Pre-expiration notifications (7, 3, 1 day)
- [ ] **6.9** Workspace usage metrics reviewed monthly
- [ ] **6.10** Cost allocation to business unit
- [ ] **6.11** Unused workspace cleanup automation

#### RESTRICTED DATA ONLY

- [ ] **6.12** Maximum workspace duration enforced (e.g., 90 days)
- [ ] **6.13** Mandatory re-approval every 30 days
- [ ] **6.14** Automatic data purge on workspace deletion

---

### 7. Approval Workflows

#### REQUIRED

- [ ] **7.1** Workspace creation requires manager approval
- [ ] **7.2** Raw data access requires data owner approval
- [ ] **7.3** Elevated permissions require security approval
- [ ] **7.4** Approval decisions logged with justification
- [ ] **7.5** Approval expiration enforced
- [ ] **7.6** Escalation path defined for stale approvals

#### RECOMMENDED

- [ ] **7.7** SLA defined for approval response time
- [ ] **7.8** Delegation of approval authority documented
- [ ] **7.9** Approval metrics tracked and reported
- [ ] **7.10** Auto-denial for expired requests
- [ ] **7.11** Approval reminder notifications

#### RESTRICTED DATA ONLY

- [ ] **7.12** Dual approval required (data owner + security)
- [ ] **7.13** Compliance team in approval chain
- [ ] **7.14** Legal review for cross-border data access
- [ ] **7.15** Executive approval for bulk operations

---

### 8. Documentation & Training

#### REQUIRED

- [ ] **8.1** Workspace purpose and scope documented
- [ ] **8.2** Data handling procedures documented
- [ ] **8.3** All users completed data security awareness training
- [ ] **8.4** Incident response procedures documented
- [ ] **8.5** Contact information for data owners current

#### RECOMMENDED

- [ ] **8.6** Analysis methodology documented (reproducibility)
- [ ] **8.7** Code/notebook version controlled
- [ ] **8.8** Results validated before export
- [ ] **8.9** Peer review for sensitive analyses
- [ ] **8.10** Knowledge transfer plan for workspace handoff

#### RESTRICTED DATA ONLY

- [ ] **8.11** Specialized training for restricted data handling
- [ ] **8.12** Signed acknowledgment of responsibilities
- [ ] **8.13** Annual recertification of training

---

## Compliance Score Calculation

```
Score = (Required Met / Required Total) * 70 +
        (Recommended Met / Recommended Total) * 30

Compliant: Score >= 85%
Conditionally Compliant: Score >= 70% (with remediation plan)
Non-Compliant: Score < 70%
```

For RESTRICTED workspaces, all RESTRICTED items are treated as REQUIRED.

---

## Review Process

### Quarterly Review (Standard Tier)

1. Self-assessment by workspace owner
2. Automated compliance scan
3. Review by data governance team
4. Remediation of gaps (14-day SLA)
5. Sign-off and certification

### Monthly Review (Enhanced Tier)

1. Automated compliance scan (weekly)
2. Manual review of flagged items
3. Stakeholder attestation
4. Remediation of gaps (7-day SLA)
5. Executive summary report

### Weekly Review (Restricted Tier)

1. Daily automated compliance scan
2. Real-time alerting on violations
3. Weekly manual audit
4. Immediate remediation required
5. Incident report for any gaps

---

## Non-Compliance Consequences

| Severity | Example | Action |
|----------|---------|--------|
| **Critical** | PII exported without approval | Immediate workspace suspension |
| **High** | Audit logging disabled | 24-hour remediation or suspension |
| **Medium** | Missing documentation | 7-day remediation window |
| **Low** | Training not current | 30-day remediation window |

---

## Exceptions

Exceptions to compliance requirements may be granted with:

1. Written business justification
2. Risk assessment
3. Compensating controls documented
4. Time-limited approval (max 90 days)
5. Executive sponsor sign-off
6. Compliance team acknowledgment

All exceptions must be logged and reviewed quarterly.

---

## References

- [Safe Analytics Workbench Blueprint](./safe-analytics-workbench.md)
- [Data Retention Policy](../governance/data-retention-policy.md)
- [AI Governance Dashboard](../governance/AI-GOVERNANCE-DASHBOARD.md)
- [OPA Policy Framework](../../services/policy/README.md)

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-07 | Data Governance | Initial version |
