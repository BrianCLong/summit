# SOC 2 Trust Services Criteria Control Mapping Matrix

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **Audit Period**: 2025-01-01 to 2025-12-31
> **Standard**: SOC 2 Type II

## Overview

This matrix maps Summit platform controls to SOC 2 Trust Services Criteria across all five categories: Security, Availability, Processing Integrity, Confidentiality, and Privacy.

---

## Security Criteria (CC)

### CC1 - Control Environment

| Control | Criteria                                                       | Implementation                     | Evidence Location               | Test Reference    |
| ------- | -------------------------------------------------------------- | ---------------------------------- | ------------------------------- | ----------------- |
| CC1.1   | Entity demonstrates commitment to integrity and ethical values | Code of conduct, security policies | `docs/policies/`                | Annual review     |
| CC1.2   | Board exercises oversight responsibility                       | Security review meetings           | `audit/ga-evidence/governance/` | Quarterly reports |
| CC1.3   | Management establishes structures and reporting lines          | Organizational chart, RACI         | `docs/organization/`            | Annual review     |
| CC1.4   | Entity demonstrates commitment to attract and retain personnel | Training records, certifications   | HR records                      | Annual review     |
| CC1.5   | Entity holds individuals accountable                           | Access reviews, performance        | HR records                      | Quarterly review  |

### CC2 - Communication and Information

| Control | Criteria                                   | Implementation             | Evidence Location           | Test Reference       |
| ------- | ------------------------------------------ | -------------------------- | --------------------------- | -------------------- |
| CC2.1   | Entity obtains relevant information        | Threat intelligence, logs  | `server/src/observability/` | `request-context.ts` |
| CC2.2   | Entity internally communicates information | Internal comms, dashboards | `audit/ga-evidence/comms/`  | Dashboard config     |
| CC2.3   | Entity communicates with external parties  | Customer notifications     | `audit/ga-evidence/comms/`  | Notification logs    |

### CC3 - Risk Assessment

| Control | Criteria                               | Implementation    | Evidence Location                         | Test Reference        |
| ------- | -------------------------------------- | ----------------- | ----------------------------------------- | --------------------- |
| CC3.1   | Entity specifies suitable objectives   | GA requirements   | `docs/ga/`                                | This document         |
| CC3.2   | Entity identifies and analyzes risks   | Threat models     | `threat-models/`                          | All threat model docs |
| CC3.3   | Entity considers potential for fraud   | Abuse detection   | `server/src/middleware/abuseDetection.ts` | Abuse tests           |
| CC3.4   | Entity identifies and assesses changes | Change management | `.github/workflows/ci-ga-gates.yml`       | CI logs               |

### CC4 - Monitoring Activities

| Control | Criteria                                          | Implementation       | Evidence Location           | Test Reference |
| ------- | ------------------------------------------------- | -------------------- | --------------------------- | -------------- |
| CC4.1   | Entity selects and develops monitoring activities | Observability stack  | `server/src/observability/` | Metrics tests  |
| CC4.2   | Entity evaluates and communicates deficiencies    | Alerting, dashboards | `deploy/monitoring/`        | Alert configs  |

### CC5 - Control Activities

| Control | Criteria                          | Implementation    | Evidence Location    | Test Reference |
| ------- | --------------------------------- | ----------------- | -------------------- | -------------- |
| CC5.1   | Entity selects control activities | This matrix       | This document        | All test files |
| CC5.2   | Entity deploys control activities | CI/CD enforcement | `.github/workflows/` | CI logs        |
| CC5.3   | Entity deploys through policies   | Policy-as-code    | `governance/`        | OPA tests      |

### CC6 - Logical and Physical Access Controls

| Control | Criteria                                                  | Implementation                            | Evidence Location                    | Test Reference                         |
| ------- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------------ | -------------------------------------- |
| CC6.1   | **Access to information is restricted**                   | GovernanceVerdict mandatory, OPA policies | `server/src/governance/`             | `governance-bypass-regression.test.ts` |
| CC6.2   | **Prior to issuing credentials, entity identifies users** | JWT validation, OIDC                      | `server/src/middleware/auth.ts`      | Auth tests                             |
| CC6.3   | Entity authorizes access based on roles                   | RBAC implementation                       | `server/src/routes/rbacRoutes.ts`    | RBAC tests                             |
| CC6.5   | Entity discontinues access when appropriate               | Token expiry, revocation                  | `server/src/lib/auth.ts`             | Session tests                          |
| CC6.6   | **Entity restricts access to sensitive information**      | Data classification, PII guard            | `server/src/middleware/pii-guard.ts` | PII tests                              |
| CC6.7   | **Entity restricts data modification**                    | Audit immutability, WORM                  | `server/src/db/audit.ts`             | Immutability tests                     |

### CC7 - System Operations

| Control | Criteria                          | Implementation               | Evidence Location                   | Test Reference      |
| ------- | --------------------------------- | ---------------------------- | ----------------------------------- | ------------------- |
| CC7.1   | **System changes are detected**   | CI gates, schema diff        | `.github/workflows/ci-ga-gates.yml` | Gate 7: Schema Diff |
| CC7.2   | **System changes are authorized** | PR approval, governance      | `.github/workflows/ci-ga-gates.yml` | Gate 5: Governance  |
| CC7.3   | System changes are evaluated      | Policy evaluation, testing   | `server/src/governance/`            | Policy tests        |
| CC7.4   | System changes are tested         | Unit, integration, E2E tests | `server/src/**/__tests__/`          | All test suites     |

### CC8 - Change Management

| Control | Criteria                   | Implementation                   | Evidence Location                   | Test Reference      |
| ------- | -------------------------- | -------------------------------- | ----------------------------------- | ------------------- |
| CC8.1   | **Changes are authorized** | Merge-safe artifact, PR approval | `.github/workflows/ci-ga-gates.yml` | Artifact generation |

### CC9 - Risk Mitigation

| Control | Criteria                               | Implementation         | Evidence Location | Test Reference    |
| ------- | -------------------------------------- | ---------------------- | ----------------- | ----------------- |
| CC9.1   | Entity identifies and assesses risks   | Threat modeling        | `threat-models/`  | Threat model docs |
| CC9.2   | Entity selects and develops activities | Control implementation | This matrix       | Control tests     |

---

## Availability Criteria (A)

| Control | Criteria                              | Implementation            | Evidence Location             | Test Reference        |
| ------- | ------------------------------------- | ------------------------- | ----------------------------- | --------------------- |
| A1.1    | **System is available for operation** | Health checks, monitoring | `server/src/routes/health.ts` | Health endpoint tests |
| A1.2    | **System components are recovered**   | DR procedures, backups    | `docs/ga/ARCHITECTURE.md`     | DR drills             |
| A1.3    | Recovery testing is performed         | DR drill records          | `audit/ga-evidence/ops/`      | DR test logs          |

---

## Processing Integrity Criteria (PI)

| Control | Criteria                                | Implementation                   | Evidence Location                                   | Test Reference                       |
| ------- | --------------------------------------- | -------------------------------- | --------------------------------------------------- | ------------------------------------ |
| PI1.1   | **Entity obtains only relevant data**   | Provenance tracking, isSimulated | `server/src/types/data-envelope.ts`                 | `export-provenance-snapshot.test.ts` |
| PI1.2   | **Processing is complete and accurate** | Validation, hash verification    | `server/src/middleware/validation.ts`               | Validation tests                     |
| PI1.3   | Processing is timely                    | Timeout enforcement              | `server/src/middleware/circuitBreakerMiddleware.ts` | Timeout tests                        |
| PI1.4   | **Processing outputs are complete**     | DataEnvelope validation          | `server/src/types/data-envelope.ts`                 | `schema-snapshot.test.ts`            |
| PI1.5   | Processing is authorized                | GovernanceVerdict                | `server/src/governance/ga-enforcement.ts`           | Bypass tests                         |

---

## Confidentiality Criteria (C)

| Control | Criteria                                    | Implementation             | Evidence Location                       | Test Reference       |
| ------- | ------------------------------------------- | -------------------------- | --------------------------------------- | -------------------- |
| C1.1    | **Confidential information is protected**   | Classification, encryption | `server/src/types/data-envelope.ts`     | Classification tests |
| C1.2    | **Confidential information is disposed of** | Retention policies         | `server/src/workers/retentionWorker.ts` | Retention tests      |

---

## Privacy Criteria (P)

| Control | Criteria                            | Implementation     | Evidence Location                       | Test Reference  |
| ------- | ----------------------------------- | ------------------ | --------------------------------------- | --------------- |
| P1.1    | Privacy notice is provided          | Privacy policy     | `docs/legal/`                           | Legal review    |
| P2.1    | Consent is obtained                 | Consent management | Application UI                          | Consent tests   |
| P3.1    | Personal information is collected   | PII detection      | `server/src/middleware/pii-guard.ts`    | PII tests       |
| P4.1    | Personal information is used        | Purpose limitation | Provenance tracking                     | Purpose tests   |
| P5.1    | Personal information is retained    | Retention policies | `server/src/workers/retentionWorker.ts` | Retention tests |
| P6.1    | Personal information is disposed of | Secure deletion    | Retention worker                        | Deletion tests  |
| P7.1    | Personal information is disclosed   | Audit logging      | `server/src/middleware/audit-logger.ts` | Audit tests     |
| P8.1    | Entity notifies of incidents        | Incident response  | `docs/runbooks/`                        | IR drills       |

---

## Control Implementation Summary

| Category                  | Total Controls | Implemented | Tested | Evidence |
| ------------------------- | -------------- | ----------- | ------ | -------- |
| Security (CC)             | 30             | 30          | 28     | ✅       |
| Availability (A)          | 3              | 3           | 3      | ✅       |
| Processing Integrity (PI) | 5              | 5           | 5      | ✅       |
| Confidentiality (C)       | 2              | 2           | 2      | ✅       |
| Privacy (P)               | 8              | 8           | 6      | ✅       |
| **TOTAL**                 | **48**         | **48**      | **44** | ✅       |

---

## Critical Controls for GA

The following controls are **critical** for GA readiness and have enhanced testing:

| Control | Description                              | Test Count | Bypass Tests |
| ------- | ---------------------------------------- | ---------- | ------------ |
| CC6.1   | Access restriction via GovernanceVerdict | 25+        | 10           |
| CC7.2   | Change authorization via CI gates        | 8          | N/A          |
| PI1.1   | Provenance tracking                      | 15+        | 6            |
| PI1.4   | Data integrity via hash verification     | 10+        | 2            |

---

## Attestation

I attest that this control matrix accurately reflects the implementation status of SOC 2 controls in the Summit platform as of the date above.

**Attested By**: [Compliance Officer Name]
**Date**: [YYYY-MM-DD]
**Signature**: [Digital Signature]

---

## References

- [GA Architecture](../docs/ga/ARCHITECTURE.md)
- [Trust Boundaries](../docs/ga/TRUST-BOUNDARIES.md)
- [Non-Capabilities](../docs/ga/NON-CAPABILITIES.md)
- [Threat Models](../threat-models/)
- [Governance Tests](../server/src/governance/__tests__/)
