# Statement of Work - IntelGraph October 2025 Pilot Program

**Customer**: ACME Corporation
**Effective Date**: October 15, 2025
**Pilot Duration**: 30 days
**Pilot End Date**: November 15, 2025
**Contract Value**: $0 (No-cost pilot)

---

## 1. Executive Summary

This Statement of Work (SOW) outlines the terms and conditions for ACME Corporation's participation in the IntelGraph October 2025 Pilot Program. The pilot will validate the new security, observability, and operational features introduced in the October 2025 release (version 2025.10.HALLOWEEN).

**Pilot Objectives**:
- Validate WebAuthn step-up authentication for sensitive operations
- Test OPA-based policy enforcement and release gate
- Evaluate SLO dashboards with trace exemplars
- Assess k6 synthetics and E2E validation workflows
- Provide feedback for General Availability (GA) release

---

## 2. Scope of Services

### 2.1 IntelGraph Platform Services

BrianCLong ("Provider") will provide the following services to ACME Corporation ("Customer"):

**Infrastructure**:
- Dedicated Kubernetes cluster for pilot environment (pilot.intelgraph-acme.example.com)
- PostgreSQL database (15 GB storage)
- Neo4j graph database (100 GB storage)
- Kafka event streaming (3-broker cluster)
- Redis caching layer
- Prometheus + Grafana observability stack
- OPA policy engine

**Application Services**:
- IntelGraph October 2025 release (version 2025.10.HALLOWEEN)
- WebAuthn step-up authentication
- OPA-based release gate and policy enforcement
- SLO dashboards with trace exemplars
- k6 synthetics suite
- E2E validation with proof artifacts
- SBOM + SLSA provenance

**Support Services**:
- Customer Success team (L1 support)
- SRE team (L2 support)
- Engineering team (L3 support)
- Weekly check-in calls (Fridays 2 PM ET)
- Slack support channel (#intelgraph-pilot-acme)

---

### 2.2 Customer Responsibilities

Customer will:

**User Provisioning**:
- Provide list of 5 pilot users (provided: john.doe@acme.com, jane.smith@acme.com, bob.johnson@acme.com, alice.williams@acme.com, charlie.brown@acme.com)
- Register WebAuthn credentials (biometric or security key) for all users
- Complete user onboarding within 5 business days of pilot start

**Data Preparation**:
- Provide sample dataset for pilot (50,000 entities - cyber threat intel data)
- Ensure data is properly formatted (JSON)
- Obtain necessary approvals for data usage in pilot environment

**Testing & Feedback**:
- Complete weekly feedback forms
- Participate in weekly check-in calls
- Test all pilot features (WebAuthn, exports, dashboards, etc.)
- Report bugs and issues via support channel
- Provide feature requests and UX feedback

**Security & Compliance**:
- Comply with pilot security policies
- Do not upload PII, PHI, or classified data without approval
- Follow WebAuthn registration and step-up procedures

---

## 3. Deliverables

### 3.1 Provider Deliverables

| Deliverable | Description | Due Date | Owner |
|-------------|-------------|----------|-------|
| Pilot Environment Setup | Dedicated Kubernetes cluster with IntelGraph deployed | October 12, 2025 | SRE |
| User Onboarding | Pilot user accounts created, credentials sent | October 15, 2025 | Customer Success |
| Training Session | 1-hour training on October 2025 features | October 16, 2025 | Product |
| Weekly Check-ins | 30-minute video calls every Friday | Weekly | Customer Success |
| Pilot Report | Final report with metrics, feedback, and recommendations | November 20, 2025 | Product |

---

### 3.2 Customer Deliverables

| Deliverable | Description | Due Date | Owner |
|-------------|-------------|----------|-------|
| User List | Names, emails, roles for 5 pilot users | October 10, 2025 ✅ | John Doe (CTO) |
| Sample Dataset | 50k entities in JSON format | October 12, 2025 | Bob Johnson (Data Engineer) |
| Weekly Feedback | Completed feedback form | Weekly (Fridays) | All Pilot Users |
| Final Survey | Pilot completion survey and satisfaction rating | November 15, 2025 | John Doe (CTO) |

---

## 4. Acceptance Criteria

*(Same as template - see PILOT_SOW_TEMPLATE.md for full details)*

---

## 5. Success Metrics

*(Same as template - see VALUE_METRICS.md for full details)*

---

## 6. Timeline

| Milestone | Date | Description |
|-----------|------|-------------|
| SOW Execution | October 4, 2025 ✅ | Both parties sign SOW |
| Environment Setup | October 12, 2025 | Pilot infrastructure provisioned |
| User Onboarding | October 15, 2025 | Pilot users created, credentials sent |
| Training Session | October 16, 2025 | 1-hour training on October 2025 features |
| Pilot Start | October 15, 2025 | Pilot officially begins |
| Week 1 Check-in | October 18, 2025 | First weekly feedback call |
| Week 2 Check-in | October 25, 2025 | Second weekly feedback call |
| Week 3 Check-in | November 1, 2025 | Third weekly feedback call |
| Week 4 Check-in | November 8, 2025 | Fourth weekly feedback call |
| Pilot End | November 15, 2025 | Pilot officially ends |
| Final Report | November 20, 2025 | Provider delivers pilot report |
| Go/No-Go Decision | November 22, 2025 | Customer decides on GA adoption |

---

## 7. Support & Escalation

*(Same as template - see PILOT_SOW_TEMPLATE.md for full details)*

---

## 8. Data & Security

**Data Handling**:
- **Data Location**: US-East (AWS us-east-1)
- **Data Retention**: 90 days after pilot end (deleted by February 15, 2026)
- **Data Backup**: Daily backups retained for 30 days
- **Data Access**: Only authorized Provider personnel (SRE: max 3 people, Customer Success: 2 people, Engineering: 5 people)

**Security Controls**:
- **Encryption at Rest**: AES-256
- **Encryption in Transit**: TLS 1.3
- **Authentication**: WebAuthn + session tokens
- **Authorization**: OPA policy enforcement
- **Audit Logging**: All actions logged with attestation references
- **Vulnerability Scanning**: CodeQL + Trivy + Gitleaks (weekly)

**Compliance**:
- **SOC 2 Type II**: Provider is SOC 2 compliant (report provided to ACME on October 1, 2025)
- **GDPR**: N/A (no EU data)
- **HIPAA**: N/A (no PHI)

---

## 9. Pricing & Payment

**Pilot Pricing**: $0 (No-cost pilot)

**Post-Pilot Pricing** (if Customer adopts GA release):
- **Professional Tier**: $10,000/month (up to 200 users, 10M entities) - **ACME's expected tier**
- **Discounts**:
  - Early adopter discount: 20% off for 12 months = $8,000/month
  - Annual prepay discount: 15% off = $102,000/year (vs $120,000)

**Estimated Annual Value**: $102,000 (if annual prepay with both discounts)

---

## 10. Terms & Conditions

*(Same as template - see PILOT_SOW_TEMPLATE.md for full details)*

---

## 11. Acceptance & Signatures

By signing below, both parties agree to the terms and conditions outlined in this Statement of Work.

**Provider**:
- Name: Brian Long
- Title: CEO
- Company: BrianCLong / IntelGraph
- Signature: /s/ Brian Long
- Date: October 4, 2025

**Customer**:
- Name: John Doe
- Title: Chief Technology Officer
- Company: ACME Corporation
- Signature: /s/ John Doe
- Date: October 4, 2025

---

**Status**: ✅ SIGNED

**Appendices**:
- Appendix A: Features→SOW Mapping Table (pilot/FEATURES_SOW_MAPPING.md)
- Appendix B: Value Metrics Tracking (pilot/VALUE_METRICS.md)
- Appendix C: Pilot Deployment Guide (docs/PILOT_DEPLOYMENT_GUIDE.md)
- Appendix D: Release Notes (docs/RELEASE_NOTES_2025.10.HALLOWEEN.md)

---

**Document Version**: 1.0 (Signed)
**Last Updated**: October 4, 2025
**Issue**: #10071
