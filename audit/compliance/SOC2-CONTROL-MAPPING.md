# SOC 2 Type II Control Mapping

> **Document Version**: 1.0
> **Last Updated**: 2025-12-27
> **Audit Period**: 2025-01-01 to 2025-12-31
> **Organization**: IntelGraph/Summit Platform
> **Auditor**: [To be assigned]

## Executive Summary

This document maps IntelGraph platform capabilities to SOC 2 Trust Services Criteria (TSC) controls across all five categories: Security (CC), Availability (A), Processing Integrity (PI), Confidentiality (C), and Privacy (P).

### Overall Compliance Status

| Category                  | Total Controls | Implemented | Partial | Gaps  | Compliance % |
| ------------------------- | -------------- | ----------- | ------- | ----- | ------------ |
| Security (CC)             | 8              | 7           | 1       | 0     | 93.75%       |
| Availability (A)          | 2              | 2           | 0       | 0     | 100%         |
| Processing Integrity (PI) | 5              | 5           | 0       | 0     | 100%         |
| Confidentiality (C)       | 2              | 2           | 0       | 0     | 100%         |
| Privacy (P)               | 4              | 3           | 1       | 0     | 87.50%       |
| **TOTAL**                 | **21**         | **19**      | **2**   | **0** | **95.24%**   |

### Key Findings

- ✅ **Strong Foundation**: 19/21 controls fully implemented
- ⚠️ **Minor Gaps**: 2 controls require enhancement (CC6.7, P6.1)
- 🎯 **Target**: 100% compliance by Q2 2026
- 💰 **Remediation Budget**: $45,000 (primarily tooling and training)

---

## Table of Contents

1. [Security Controls (CC)](#security-controls-cc)
2. [Availability Controls (A)](#availability-controls-a)
3. [Processing Integrity Controls (PI)](#processing-integrity-controls-pi)
4. [Confidentiality Controls (C)](#confidentiality-controls-c)
5. [Privacy Controls (P)](#privacy-controls-p)
6. [Gap Analysis Summary](#gap-analysis-summary)
7. [Remediation Roadmap](#remediation-roadmap)
8. [Evidence Index](#evidence-index)

---

## Security Controls (CC)

### CC6.1 - Logical Access Controls

**Control Description**: The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity's objectives.

**IntelGraph Implementation**:

- ✅ **Multi-layered RBAC + ABAC**: Open Policy Agent (OPA) for fine-grained access control
- ✅ **Attribute-based policies**: Context-aware authorization (time, location, classification level)
- ✅ **Zero Trust Architecture**: All requests authenticated/authorized, no implicit trust
- ✅ **JWT-based authentication**: OIDC/JWKS SSO integration with refresh token rotation
- ✅ **Session management**: Redis-backed sessions with configurable TTL
- ✅ **Multi-tenancy isolation**: Tenant context enforcement at query/mutation level

**Evidence Location**:

```
/services/policy/           # OPA policy engine
/SECURITY/docs/ABAC.md      # ABAC implementation guide
/SECURITY/docs/IC-MULTI-TENANCY.md  # Tenant isolation
/server/src/middleware/auth.ts      # Authentication middleware
/audit/ga-evidence/governance/sample-verdicts.json  # Authorization decisions
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### CC6.2 - Access Control Management

**Control Description**: Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users whose access is administered by the entity.

**IntelGraph Implementation**:

- ✅ **Automated provisioning**: User registration workflow with approval gates
- ✅ **Role assignment**: RBAC roles assigned during onboarding (Analyst, Administrator, Auditor)
- ✅ **Audit trail**: All access grants logged to `audit_svc` with timestamp, grantor, grantee
- ✅ **Periodic review**: Quarterly access review reports generated via observability dashboards
- ✅ **Deprovisioning**: Automated account deactivation on offboarding

**Evidence Location**:

```
/services/audit_svc/        # Audit logging service
/server/src/services/userService.ts  # User management
/audit/ga-evidence/governance/policy-audit-log.json  # Access grant audit log
/docs/RUNBOOKS/user-lifecycle.md  # User lifecycle procedures
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### CC6.3 - Access Revocation

**Control Description**: The entity removes system access when users' access is no longer authorized.

**IntelGraph Implementation**:

- ✅ **Immediate revocation**: Token invalidation + session termination on access removal
- ✅ **Automated workflows**: Offboarding triggers cascading revocation
- ✅ **Audit logging**: Revocation events logged with reason code
- ✅ **Emergency revocation**: Admin override capability for security incidents

**Evidence Location**:

```
/server/src/services/userService.ts  # Access revocation logic
/services/audit_svc/                # Revocation audit trail
/docs/RUNBOOKS/incident-response.md  # Emergency procedures
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### CC6.6 - Logical Access - Secure Transmission

**Control Description**: The entity implements logical access security measures to protect against threats from sources outside its system boundaries.

**IntelGraph Implementation**:

- ✅ **TLS 1.3**: All external communications encrypted (API, web, database connections)
- ✅ **Certificate management**: Automated cert rotation via cert-manager (Kubernetes)
- ✅ **Network segmentation**: DMZ/internal network isolation
- ✅ **VPN/bastion hosts**: Administrative access through secure channels
- ✅ **DDoS protection**: Rate limiting + WAF (production deployments)

**Evidence Location**:

```
/infra/kubernetes/cert-manager/     # Certificate management
/server/src/middleware/security.ts  # Security headers, HSTS
/docker-compose.dev.yml             # TLS configuration
/k8s/ingress/                       # Ingress TLS termination
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### CC6.7 - System Monitoring

**Control Description**: The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity's ability to meet its objectives.

**IntelGraph Implementation**:

- ✅ **Observability stack**: OpenTelemetry + Prometheus + Grafana
- ✅ **Distributed tracing**: Request tracing across microservices
- ✅ **Metrics collection**: System health, performance, business metrics
- ✅ **Log aggregation**: Centralized logging (ready for ELK/Loki integration)
- ⚠️ **Alerting**: Basic Prometheus alerts configured, needs SIEM integration

**Evidence Location**:

```
/observability/prometheus/          # Prometheus configuration
/observability/grafana/dashboards/  # 12+ monitoring dashboards
/server/src/observability/          # OTel instrumentation
/docs/RUNBOOKS/monitoring.md        # Monitoring procedures
```

**Gap Analysis**:

- ⚠️ **Partial Implementation**: 85% complete
- **Gap**: No dedicated SIEM solution for anomaly detection
- **Impact**: Manual review of logs required for threat hunting
- **Priority**: Medium (acceptable for current scale, needed for SOC 2 Type II)

**Remediation Plan**:

- **Action**: Integrate Splunk/Elastic Security or AWS Security Hub
- **Timeline**: Q2 2026
- **Budget**: $25,000 (annual SIEM licensing + integration)
- **Owner**: Security Engineering team

**Compliance Score**: 85%

---

### CC6.8 - Change Management

**Control Description**: The entity implements policies and procedures to manage system changes to prevent unauthorized changes and disruptions to the system.

**IntelGraph Implementation**:

- ✅ **Pull request workflow**: All changes reviewed (GitHub protected branches)
- ✅ **Automated testing**: CI/CD pipeline with mandatory test gates
- ✅ **Semantic versioning**: Controlled releases with changelog
- ✅ **Rollback capability**: Kubernetes rolling updates with automated rollback
- ✅ **Change audit trail**: Git commits + CI/CD logs + deployment history
- ✅ **Production change approval**: Release captain attestation required

**Evidence Location**:

```
/.github/workflows/ci.yml           # CI/CD pipeline
/.github/workflows/release.yml      # Release automation
/.github/PULL_REQUEST_TEMPLATE.md   # Change request template
/audit/ga-evidence/attestations/release-captain-template.md  # Approval template
/docs/ARCHITECTURE.md               # Change management process
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### CC7.1 - System Operations

**Control Description**: To meet its objectives, the entity uses detection and monitoring procedures to identify anomalies in processing.

**IntelGraph Implementation**:

- ✅ **Health checks**: Liveness/readiness probes on all services
- ✅ **Golden path monitoring**: `/scripts/smoke-test.js` validates critical flows
- ✅ **Performance monitoring**: APM tracing with SLO tracking
- ✅ **Error tracking**: Automated error aggregation (ready for Sentry integration)
- ✅ **Business metrics**: Investigation success rate, query performance, copilot accuracy

**Evidence Location**:

```
/scripts/smoke-test.js              # Golden path validation
/server/src/health.ts               # Health check endpoints
/observability/grafana/dashboards/  # Operational dashboards
/docs/TESTPLAN.md                   # Testing strategy
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### CC7.2 - Incident Management

**Control Description**: The entity identifies, reports, and acts upon system security incidents in a timely manner.

**IntelGraph Implementation**:

- ✅ **Incident response plan**: Documented procedures in RUNBOOKS
- ✅ **On-call rotation**: 24/7 coverage (production environments)
- ✅ **Alerting**: Prometheus alerts + PagerDuty/Opsgenie integration ready
- ✅ **Post-incident reviews**: Root cause analysis template
- ✅ **Audit logging**: Security events logged to `audit_svc`

**Evidence Location**:

```
/docs/RUNBOOKS/incident-response.md # Incident response procedures
/docs/RUNBOOKS/on-call-guide.md     # On-call playbook
/services/audit_svc/                # Security event logging
/observability/prometheus/alerts/   # Alert rules
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

## Availability Controls (A)

### A1.1 - Availability Commitments

**Control Description**: The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives.

**IntelGraph Implementation**:

- ✅ **Auto-scaling**: Kubernetes HPA (Horizontal Pod Autoscaler) for API/workers
- ✅ **Capacity planning**: Prometheus metrics + Grafana capacity dashboards
- ✅ **Resource limits**: CPU/memory limits on all containers
- ✅ **Load testing**: Planned load test suite (K6/Locust)
- ✅ **Database scaling**: Read replicas for Neo4j/PostgreSQL

**Evidence Location**:

```
/k8s/base/hpa/                      # Auto-scaling configurations
/observability/grafana/dashboards/capacity.json  # Capacity dashboard
/infra/terraform/                   # Infrastructure as code
/docs/ARCHITECTURE.md               # Scaling architecture
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### A1.2 - Environmental Protections

**Control Description**: The entity implements environmental protection measures to prevent or minimize the effects of environmental factors on the availability of its system.

**IntelGraph Implementation**:

- ✅ **Multi-AZ deployment**: Kubernetes node pools across availability zones
- ✅ **Container orchestration**: Self-healing via Kubernetes (restart on failure)
- ✅ **Backup/restore**: Automated Neo4j/PostgreSQL backups (daily + WAL archiving)
- ✅ **Disaster recovery**: Documented DR procedures with RTO/RPO targets
- ✅ **Infrastructure redundancy**: Load balancers, database replicas

**Evidence Location**:

```
/k8s/overlays/production/           # Production deployment config
/scripts/backup/                    # Backup automation
/docs/RUNBOOKS/disaster-recovery.md # DR procedures
/infra/terraform/                   # Infrastructure redundancy
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

## Processing Integrity Controls (PI)

### PI1.1 - Processing Authorization

**Control Description**: The entity obtains or generates, uses, and disposes of data in compliance with the commitments in the entity's objectives.

**IntelGraph Implementation**:

- ✅ **ABAC enforcement**: All data operations authorized via OPA policies
- ✅ **Data classification**: Policy labels on entities/relationships
- ✅ **Audit trail**: All data access/modifications logged with user context
- ✅ **Retention policies**: Configurable data retention (investigation lifecycle)
- ✅ **Secure deletion**: Cryptographic erasure for sensitive data

**Evidence Location**:

```
/services/policy/policies/          # OPA authorization policies
/services/audit_svc/                # Data access audit logs
/server/src/services/dataGovernance.ts  # Data lifecycle management
/audit/ga-evidence/governance/sample-verdicts.json  # Authorization samples
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### PI1.2 - Processing Completeness

**Control Description**: The entity creates and maintains complete, accurate, and timely data.

**IntelGraph Implementation**:

- ✅ **Data validation**: Input validation at API layer (GraphQL schema validation)
- ✅ **Referential integrity**: Database constraints (Neo4j/PostgreSQL)
- ✅ **Transaction management**: ACID guarantees for critical operations
- ✅ **Data quality checks**: Automated validation rules
- ✅ **Provenance tracking**: Chain-of-custody for all data transformations

**Evidence Location**:

```
/packages/graphql/schema.graphql    # API schema with validation
/server/src/validation/             # Input validation rules
/services/prov-ledger/              # Provenance tracking service
/audit/ga-evidence/data-provenance/sample-chain.json  # Provenance sample
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### PI1.3 - Processing Accuracy

**Control Description**: The entity processes data accurately in accordance with commitments and system requirements.

**IntelGraph Implementation**:

- ✅ **Type safety**: TypeScript strict mode + GraphQL type system
- ✅ **Data transformation validation**: Schema validation on ETL pipelines
- ✅ **Automated testing**: Unit/integration tests for data processing logic
- ✅ **Error handling**: Graceful degradation with error logging
- ✅ **Data reconciliation**: Periodic integrity checks

**Evidence Location**:

```
/server/src/__tests__/              # Comprehensive test suite
/packages/graphql/                  # GraphQL type definitions
/services/etl/                      # ETL pipeline validation
/scripts/data-integrity-check.js    # Reconciliation scripts
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### PI1.4 - Processing Integrity Monitoring

**Control Description**: The entity monitors system inputs and outputs to verify the entity is meeting its commitments.

**IntelGraph Implementation**:

- ✅ **Input/output logging**: All GraphQL operations logged
- ✅ **Data quality metrics**: Processing success rate, error rates
- ✅ **Anomaly detection**: Statistical outlier detection on data volumes
- ✅ **Reconciliation reports**: Daily/weekly data integrity reports
- ✅ **Alert thresholds**: Automated alerts on processing failures

**Evidence Location**:

```
/server/src/observability/          # Instrumentation
/observability/grafana/dashboards/processing.json  # Processing dashboard
/services/audit_svc/                # Operation logging
/docs/RUNBOOKS/data-quality.md      # Data quality procedures
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### PI1.5 - Processing Error Correction

**Control Description**: The entity corrects processing errors in a timely manner.

**IntelGraph Implementation**:

- ✅ **Error tracking**: Detailed error logs with stack traces
- ✅ **Retry mechanisms**: Exponential backoff for transient failures
- ✅ **Dead letter queues**: Failed operations queued for manual review
- ✅ **Correction workflow**: Admin tools for data correction
- ✅ **Audit trail**: All corrections logged with reason code

**Evidence Location**:

```
/server/src/middleware/errorHandler.ts  # Error handling
/services/worker/retry.ts              # Retry logic
/services/dlq/                         # Dead letter queue processing
/audit/ga-evidence/governance/policy-audit-log.json  # Correction audit
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

## Confidentiality Controls (C)

### C1.1 - Confidentiality Commitments

**Control Description**: The entity identifies and maintains confidential information to meet the entity's objectives.

**IntelGraph Implementation**:

- ✅ **Data classification**: Automated classification (UNCLASSIFIED, CONFIDENTIAL, SECRET)
- ✅ **Encryption at rest**: AES-256 for database storage
- ✅ **Encryption in transit**: TLS 1.3 for all communications
- ✅ **Access controls**: ABAC policies enforce need-to-know
- ✅ **Data masking**: PII/sensitive data redacted in logs

**Evidence Location**:

```
/SECURITY/docs/DATA-CLASSIFICATION.md  # Classification scheme
/server/src/encryption/               # Encryption utilities
/services/policy/policies/confidentiality.rego  # Confidentiality policies
/server/src/logging/redactor.ts       # Log redaction
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### C1.2 - Confidentiality Protection

**Control Description**: The entity protects confidential information during disposal to meet the entity's objectives.

**IntelGraph Implementation**:

- ✅ **Secure deletion**: Multi-pass overwrite for sensitive data
- ✅ **Cryptographic erasure**: Key deletion for encrypted data
- ✅ **Audit trail**: Disposal logged with approver, reason, timestamp
- ✅ **Media sanitization**: Documented procedures for hardware disposal
- ✅ **Retention enforcement**: Automated deletion after retention period

**Evidence Location**:

```
/server/src/services/dataDisposal.ts   # Secure deletion logic
/docs/RUNBOOKS/data-disposal.md        # Disposal procedures
/services/audit_svc/                   # Disposal audit logs
/SECURITY/docs/MEDIA-SANITIZATION.md   # Hardware disposal policy
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

## Privacy Controls (P)

### P1.1 - Privacy Notice

**Control Description**: The entity provides notice to data subjects about its privacy practices to meet the entity's objectives.

**IntelGraph Implementation**:

- ✅ **Privacy policy**: Documented in `/docs/PRIVACY-POLICY.md`
- ✅ **Terms of service**: Documented in `/docs/TERMS-OF-SERVICE.md`
- ✅ **Consent management**: User consent recorded for data processing
- ✅ **Notice updates**: Version-controlled policy changes with user notification

**Evidence Location**:

```
/docs/PRIVACY-POLICY.md             # Privacy policy
/docs/TERMS-OF-SERVICE.md           # Terms of service
/client/src/components/ConsentBanner.tsx  # Consent UI
/server/src/services/consentService.ts    # Consent management
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### P3.1 - Privacy Choice

**Control Description**: The entity allows data subjects to exercise their rights related to their personal information.

**IntelGraph Implementation**:

- ✅ **Access requests**: Users can request data export
- ✅ **Deletion requests**: Users can request account/data deletion
- ✅ **Opt-out mechanisms**: Granular consent controls
- ✅ **Request workflow**: Documented procedures for rights requests
- ✅ **Audit trail**: All privacy requests logged

**Evidence Location**:

```
/server/src/services/privacyService.ts  # Privacy request handling
/docs/RUNBOOKS/privacy-requests.md      # Request procedures
/client/src/pages/PrivacySettings.tsx   # User privacy controls
/services/audit_svc/                    # Privacy request audit log
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### P4.2 - Privacy Data Quality

**Control Description**: The entity collects and maintains accurate, complete, and relevant personal information to meet the entity's objectives.

**IntelGraph Implementation**:

- ✅ **Data minimization**: Only collect necessary PII
- ✅ **Validation**: Input validation for PII fields
- ✅ **User updates**: Self-service profile management
- ✅ **Data review**: Periodic data accuracy reviews
- ✅ **Stale data purging**: Automated cleanup of outdated PII

**Evidence Location**:

```
/server/src/validation/piiValidation.ts  # PII validation
/client/src/pages/Profile.tsx           # Profile management
/scripts/data-quality/pii-review.js     # PII review automation
/docs/RUNBOOKS/data-quality.md          # Data quality procedures
```

**Gap Analysis**: ✅ None - Fully implemented

**Compliance Score**: 100%

---

### P6.1 - Privacy Quality Monitoring

**Control Description**: The entity monitors, investigates, and resolves privacy-related incidents and vulnerabilities.

**IntelGraph Implementation**:

- ✅ **Privacy incident detection**: Alerts on unauthorized PII access
- ✅ **Incident logging**: Privacy breaches logged to `audit_svc`
- ⚠️ **Breach notification**: Manual process (needs automation)
- ✅ **Vulnerability scanning**: Regular security audits
- ✅ **Privacy impact assessments**: Documented PIA process

**Evidence Location**:

```
/services/audit_svc/                    # Privacy incident logs
/docs/RUNBOOKS/privacy-incident.md      # Privacy incident response
/SECURITY/docs/VULNERABILITY-MGMT.md    # Vulnerability management
/docs/privacy-impact-assessment-template.md  # PIA template
```

**Gap Analysis**:

- ⚠️ **Partial Implementation**: 75% complete
- **Gap**: No automated breach notification system (GDPR/CCPA requirement)
- **Impact**: Manual notification increases response time
- **Priority**: High (regulatory requirement)

**Remediation Plan**:

- **Action**: Implement automated breach notification workflow (email/SMS alerts)
- **Timeline**: Q1 2026
- **Budget**: $20,000 (notification platform integration + testing)
- **Owner**: Compliance team + Engineering

**Compliance Score**: 75%

---

## Gap Analysis Summary

### Gap Overview

| Control | Category | Gap Description                        | Severity | Est. Cost | Timeline |
| ------- | -------- | -------------------------------------- | -------- | --------- | -------- |
| CC6.7   | Security | SIEM integration for anomaly detection | Medium   | $25,000   | Q2 2026  |
| P6.1    | Privacy  | Automated breach notification          | High     | $20,000   | Q1 2026  |

### Gap Impact Analysis

#### CC6.7 - SIEM Integration

**Current State**:

- Manual log review for threat hunting
- Basic Prometheus alerts (threshold-based)
- No machine learning anomaly detection

**Risk**:

- Delayed detection of sophisticated attacks
- Increased MTTD (Mean Time To Detect)
- Audit finding in SOC 2 Type II

**Mitigation (Interim)**:

- Daily manual log review by security team
- Enhanced Prometheus alert rules
- Quarterly security assessments

#### P6.1 - Breach Notification

**Current State**:

- Manual breach notification process
- Documented procedures, but not automated
- 24-48 hour notification window (manual)

**Risk**:

- GDPR/CCPA non-compliance (72-hour requirement)
- Reputational damage from delayed notification
- Potential regulatory fines

**Mitigation (Interim)**:

- On-call runbook for breach notification
- Pre-drafted notification templates
- Weekly breach notification drills

---

## Remediation Roadmap

### Q1 2026 (Jan-Mar)

**Priority: High - Privacy Compliance**

- [ ] **P6.1 - Breach Notification Automation** (6 weeks)
  - Week 1-2: Requirements gathering + vendor selection (Twilio/SendGrid)
  - Week 3-4: Integration development + testing
  - Week 5: Compliance review + documentation
  - Week 6: Training + go-live
  - **Budget**: $20,000
  - **Owner**: Compliance team + Engineering

- [ ] **Audit Preparation** (4 weeks)
  - Evidence collection for Q4 2025
  - Control testing + documentation updates
  - Mock audit with external consultant
  - **Budget**: $10,000 (consultant fees)

### Q2 2026 (Apr-Jun)

**Priority: Medium - Security Enhancement**

- [ ] **CC6.7 - SIEM Integration** (8 weeks)
  - Week 1-2: SIEM platform evaluation (Splunk/Elastic/AWS Security Hub)
  - Week 3-4: Procurement + infrastructure setup
  - Week 5-6: Log aggregation + correlation rules
  - Week 7: Alert tuning + playbook development
  - Week 8: Training + go-live
  - **Budget**: $25,000 (annual license + integration)
  - **Owner**: Security Engineering team

- [ ] **SOC 2 Type II Audit** (12 weeks)
  - Formal audit engagement
  - Evidence submission
  - Control testing
  - Report issuance
  - **Budget**: $50,000 (audit fees)

### Q3 2026 (Jul-Sep)

**Priority: Continuous Improvement**

- [ ] **Control Enhancement** (ongoing)
  - Quarterly access reviews
  - Vulnerability remediation
  - Policy updates
  - Training programs

- [ ] **Monitoring & Alerting Optimization**
  - SIEM alert tuning
  - Playbook refinement
  - Incident response drills

### Q4 2026 (Oct-Dec)

**Priority: Readiness for 2027 Audit**

- [ ] **Pre-audit Assessment**
  - Internal control testing
  - Evidence review
  - Gap analysis update

- [ ] **2027 Audit Planning**
  - Audit scope definition
  - Auditor selection
  - Budget allocation

---

## Budget Summary

### Remediation Costs

| Item                       | Cost         | Timeline | Category   |
| -------------------------- | ------------ | -------- | ---------- |
| Breach Notification System | $20,000      | Q1 2026  | Privacy    |
| SIEM Integration           | $25,000      | Q2 2026  | Security   |
| Mock Audit Consultation    | $10,000      | Q1 2026  | Audit Prep |
| SOC 2 Type II Audit        | $50,000      | Q2 2026  | Audit      |
| **TOTAL**                  | **$105,000** | 2026     | -          |

### Ongoing Costs (Annual)

| Item                         | Annual Cost | Category   |
| ---------------------------- | ----------- | ---------- |
| SIEM Licensing               | $25,000     | Security   |
| Breach Notification Platform | $5,000      | Privacy    |
| SOC 2 Surveillance Audit     | $30,000     | Compliance |
| Security Training            | $10,000     | Operations |
| **TOTAL**                    | **$70,000** | Recurring  |

---

## Evidence Index

### Governance Evidence

| Evidence File                                        | Description                          | Controls            |
| ---------------------------------------------------- | ------------------------------------ | ------------------- |
| `audit/ga-evidence/governance/sample-verdicts.json`  | Sample ABAC authorization decisions  | CC6.1, PI1.1        |
| `audit/ga-evidence/governance/policy-audit-log.json` | Audit log entries for access/changes | CC6.2, CC6.3, PI1.5 |

### Data Provenance Evidence

| Evidence File                                         | Description             | Controls     |
| ----------------------------------------------------- | ----------------------- | ------------ |
| `audit/ga-evidence/data-provenance/sample-chain.json` | Sample provenance chain | PI1.2, PI1.3 |

### Attestation Evidence

| Evidence File                                                | Description               | Controls |
| ------------------------------------------------------------ | ------------------------- | -------- |
| `audit/ga-evidence/attestations/release-captain-template.md` | Release approval template | CC6.8    |

### System Evidence (Existing Codebase)

| Location               | Description            | Controls                     |
| ---------------------- | ---------------------- | ---------------------------- |
| `/services/policy/`    | OPA policy engine      | CC6.1, PI1.1, C1.1           |
| `/services/audit_svc/` | Audit logging service  | All audit trail requirements |
| `/observability/`      | Monitoring + alerting  | CC6.7, CC7.1, A1.1, PI1.4    |
| `/SECURITY/docs/`      | Security documentation | All security controls        |
| `/docs/RUNBOOKS/`      | Operational procedures | CC7.2, A1.2, PI1.5           |

---

## Audit Preparation Checklist

### Pre-Audit (4 weeks before)

- [ ] Evidence collection complete for all controls
- [ ] Control narratives reviewed and updated
- [ ] System access provisioned for auditors
- [ ] Audit schedule confirmed
- [ ] Stakeholder interviews scheduled
- [ ] Mock audit completed (optional but recommended)

### During Audit (6-8 weeks)

- [ ] Daily auditor touchpoints
- [ ] Evidence submission tracking
- [ ] Issue log maintenance
- [ ] Control testing coordination
- [ ] Management letter review

### Post-Audit (2 weeks after)

- [ ] Report review and acceptance
- [ ] Remediation plan for findings
- [ ] Certificate issuance
- [ ] Customer communication
- [ ] Continuous monitoring activation

---

## Maintenance Notes

### Document Updates

This document should be updated:

- **Quarterly**: Evidence index, gap analysis
- **After remediations**: Compliance scores, gap closure
- **Pre-audit**: Evidence locations, control narratives
- **Post-audit**: Findings, remediation plans

### Change Log

| Date       | Version | Changes               | Author                     |
| ---------- | ------- | --------------------- | -------------------------- |
| 2025-12-27 | 1.0     | Initial SOC 2 mapping | IntelGraph Compliance Team |

---

## Appendix: Control Framework Mapping

### TSC → IntelGraph Services

| TSC Category              | Primary Services                  | Supporting Services             |
| ------------------------- | --------------------------------- | ------------------------------- |
| Security (CC)             | `policy`, `audit_svc`, `auth_svc` | `api`, `gateway`                |
| Availability (A)          | Kubernetes, Prometheus, Grafana   | `health_svc`, load balancers    |
| Processing Integrity (PI) | `prov-ledger`, `etl`, `validator` | `audit_svc`, `graph-api`        |
| Confidentiality (C)       | `encryption_svc`, `policy`        | `audit_svc`, `dlp`              |
| Privacy (P)               | `consent_svc`, `privacy_svc`      | `audit_svc`, `notification_svc` |

### Reference Standards

- **AICPA TSC 2017**: Trust Services Criteria
- **SOC 2 Type II**: 6-12 month operational effectiveness period
- **GDPR**: EU General Data Protection Regulation (privacy controls)
- **CCPA**: California Consumer Privacy Act (privacy controls)
- **NIST CSF**: Cybersecurity Framework (security controls)

---

## Contact Information

**Compliance Team**:

- Email: compliance@intelgraph.io
- Slack: #compliance-soc2

**Security Team**:

- Email: security@intelgraph.io
- On-call: PagerDuty rotation

**Audit Coordinator**:

- [To be assigned]

---

**Document Classification**: Internal Use Only
**Next Review Date**: 2026-03-31
