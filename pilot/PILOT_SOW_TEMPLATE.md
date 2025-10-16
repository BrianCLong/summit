# Statement of Work - IntelGraph October 2025 Pilot Program

**Customer**: [CUSTOMER_NAME]
**Effective Date**: [START_DATE]
**Pilot Duration**: 30 days
**Pilot End Date**: [END_DATE]
**Contract Value**: $0 (No-cost pilot)

---

## 1. Executive Summary

This Statement of Work (SOW) outlines the terms and conditions for [CUSTOMER_NAME]'s participation in the IntelGraph October 2025 Pilot Program. The pilot will validate the new security, observability, and operational features introduced in the October 2025 release (version 2025.10.HALLOWEEN).

**Pilot Objectives**:

- Validate WebAuthn step-up authentication for sensitive operations
- Test OPA-based policy enforcement and release gate
- Evaluate SLO dashboards with trace exemplars
- Assess k6 synthetics and E2E validation workflows
- Provide feedback for General Availability (GA) release

---

## 2. Scope of Services

### 2.1 IntelGraph Platform Services

BrianCLong ("Provider") will provide the following services to [CUSTOMER_NAME] ("Customer"):

**Infrastructure**:

- Dedicated Kubernetes cluster for pilot environment
- PostgreSQL database (15+ GB storage)
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
- Slack support channel (#intelgraph-pilot-[customer])

---

### 2.2 Customer Responsibilities

Customer will:

**User Provisioning**:

- Provide list of 3-10 pilot users (name, email, role)
- Register WebAuthn credentials (biometric or security key) for all users
- Complete user onboarding within 5 business days of pilot start

**Data Preparation**:

- Provide sample dataset for pilot (10,000-100,000 entities)
- Ensure data is properly formatted (CSV, JSON, or GraphML)
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

| Deliverable             | Description                                              | Due Date          | Owner            |
| ----------------------- | -------------------------------------------------------- | ----------------- | ---------------- |
| Pilot Environment Setup | Dedicated Kubernetes cluster with IntelGraph deployed    | [SETUP_DATE]      | SRE              |
| User Onboarding         | Pilot user accounts created, credentials sent            | [ONBOARDING_DATE] | Customer Success |
| Training Session        | 1-hour training on October 2025 features                 | [TRAINING_DATE]   | Product          |
| Weekly Check-ins        | 30-minute video calls every Friday                       | Weekly            | Customer Success |
| Pilot Report            | Final report with metrics, feedback, and recommendations | [REPORT_DATE]     | Product          |

---

### 3.2 Customer Deliverables

| Deliverable     | Description                                     | Due Date         | Owner          |
| --------------- | ----------------------------------------------- | ---------------- | -------------- |
| User List       | Names, emails, roles for 3-10 pilot users       | [USER_LIST_DATE] | [CUSTOMER_POC] |
| Sample Dataset  | 10k-100k entities in supported format           | [DATA_DATE]      | [CUSTOMER_POC] |
| Weekly Feedback | Completed feedback form                         | Weekly (Fridays) | Pilot Users    |
| Final Survey    | Pilot completion survey and satisfaction rating | [SURVEY_DATE]    | [CUSTOMER_POC] |

---

## 4. Acceptance Criteria

### 4.1 WebAuthn Step-Up Authentication

- [ ] ≥90% of pilot users successfully register WebAuthn credentials
- [ ] ≥80% of export operations include step-up authentication
- [ ] <5% false positive rate (legitimate operations blocked)
- [ ] User satisfaction rating ≥4/5 for step-up UX

### 4.2 OPA Policy Enforcement

- [ ] Release gate blocks PRs with missing SBOM (validated via test)
- [ ] Release gate blocks PRs with critical vulnerabilities (validated via test)
- [ ] Policy decisions visible in dashboards
- [ ] <2% false positive rate for policy violations

### 4.3 SLO Dashboards & Observability

- [ ] All 5 SLO panels populated with live data (API latency, OPA latency, queue lag, ingest failures, golden flow)
- [ ] Trace exemplars clickable and linked to traces in Tempo
- [ ] Alerts fire and route to Slack/PagerDuty
- [ ] User satisfaction rating ≥4/5 for dashboard usability

### 4.4 Performance & Availability

- [ ] Uptime: ≥99.5% over 30-day pilot
- [ ] API p95 latency: <1.5s (SLO)
- [ ] OPA p95 latency: <500ms (SLO)
- [ ] Golden flow success rate: >99% (SLO)
- [ ] Zero critical security incidents

### 4.5 Support & Satisfaction

- [ ] <5% of support requests escalated to L3 (Engineering)
- [ ] Average response time: <2 hours for high-priority issues
- [ ] Overall pilot satisfaction rating: ≥4/5

---

## 5. Success Metrics

### 5.1 Technical Metrics

**Baseline (Pre-Pilot)**:

- Authentication: Single-factor (session token only)
- Release Process: Manual security review
- Observability: Basic metrics, no SLO dashboards
- Testing: Manual QA, no synthetics

**Target (Post-Pilot)**:

- Authentication: Multi-factor with WebAuthn step-up
- Release Process: Automated OPA policy enforcement
- Observability: Complete SLO dashboards with trace exemplars
- Testing: Automated k6 synthetics + E2E validation

| Metric                      | Baseline            | Target                    | Measurement                         |
| --------------------------- | ------------------- | ------------------------- | ----------------------------------- |
| Authentication Security     | Low (single-factor) | High (WebAuthn step-up)   | % of risky operations with step-up  |
| Release Gate Compliance     | 60% (manual)        | 95% (automated)           | % of releases passing policy checks |
| Observability Coverage      | 40% (basic metrics) | 95% (full SLO dashboards) | % of SLOs with dashboards + alerts  |
| Test Automation             | 30% (manual QA)     | 90% (synthetics + E2E)    | % of tests automated                |
| Mean Time to Detect (MTTD)  | 30 minutes          | 5 minutes                 | Avg time from incident to alert     |
| Mean Time to Resolve (MTTR) | 4 hours             | 1 hour                    | Avg time from alert to resolution   |

---

### 5.2 Business Metrics

| Metric                | Baseline | Target   | Measurement                                    |
| --------------------- | -------- | -------- | ---------------------------------------------- |
| User Satisfaction     | 3.5/5    | ≥4/5     | Weekly feedback surveys                        |
| Feature Adoption      | N/A      | ≥80%     | % of users using WebAuthn, exports, dashboards |
| Support Ticket Volume | 50/week  | <20/week | # of support tickets filed                     |
| Time to Value         | 14 days  | 7 days   | Days from onboarding to first export           |

---

## 6. Timeline

| Milestone         | Date              | Description                              |
| ----------------- | ----------------- | ---------------------------------------- |
| SOW Execution     | [SOW_DATE]        | Both parties sign SOW                    |
| Environment Setup | [SETUP_DATE]      | Pilot infrastructure provisioned         |
| User Onboarding   | [ONBOARDING_DATE] | Pilot users created, credentials sent    |
| Training Session  | [TRAINING_DATE]   | 1-hour training on October 2025 features |
| Pilot Start       | [START_DATE]      | Pilot officially begins                  |
| Week 1 Check-in   | [WEEK1_DATE]      | First weekly feedback call               |
| Week 2 Check-in   | [WEEK2_DATE]      | Second weekly feedback call              |
| Week 3 Check-in   | [WEEK3_DATE]      | Third weekly feedback call               |
| Week 4 Check-in   | [WEEK4_DATE]      | Fourth weekly feedback call              |
| Pilot End         | [END_DATE]        | Pilot officially ends                    |
| Final Report      | [REPORT_DATE]     | Provider delivers pilot report           |
| Go/No-Go Decision | [DECISION_DATE]   | Customer decides on GA adoption          |

---

## 7. Support & Escalation

### 7.1 Support Channels

**Primary Support**:

- Email: pilot-support@intelgraph.example.com
- Slack: #intelgraph-pilot-[customer]
- Phone: +1 (555) 123-4567 (business hours only)

**Escalation Path**:

- L1 (Customer Success): First response, general questions
- L2 (SRE): Technical issues, performance problems
- L3 (Engineering): Complex bugs, feature requests

### 7.2 Support SLAs

| Severity | Description                                | Response Time | Resolution Time |
| -------- | ------------------------------------------ | ------------- | --------------- |
| Critical | Service down, no workaround                | 15 minutes    | 4 hours         |
| High     | Major feature broken, workaround available | 2 hours       | 1 business day  |
| Medium   | Minor issue, limited impact                | 8 hours       | 3 business days |
| Low      | Question, enhancement request              | 24 hours      | 5 business days |

---

## 8. Data & Security

### 8.1 Data Handling

- **Data Location**: US-East (AWS/GCP/Azure)
- **Data Retention**: 90 days after pilot end, then deleted
- **Data Backup**: Daily backups retained for 30 days
- **Data Access**: Only authorized Provider personnel (SRE, Customer Success, Engineering)

### 8.2 Security Controls

- **Encryption at Rest**: AES-256
- **Encryption in Transit**: TLS 1.3
- **Authentication**: WebAuthn + session tokens
- **Authorization**: OPA policy enforcement
- **Audit Logging**: All actions logged with attestation references
- **Vulnerability Scanning**: CodeQL + Trivy + Gitleaks (weekly)

### 8.3 Compliance

- **SOC 2 Type II**: Provider is SOC 2 compliant (report available on request)
- **GDPR**: Data processing addendum (DPA) available if EU data is involved
- **HIPAA**: Not applicable (no PHI in pilot environment)

---

## 9. Pricing & Payment

**Pilot Pricing**: $0 (No-cost pilot)

**Post-Pilot Pricing** (if Customer adopts GA release):

- **Standard Tier**: $5,000/month (up to 50 users, 1M entities)
- **Professional Tier**: $10,000/month (up to 200 users, 10M entities)
- **Enterprise Tier**: Custom pricing (unlimited users/entities)

**Discounts**:

- Early adopter discount: 20% off for 12 months (if signed within 30 days of pilot end)
- Annual prepay discount: 15% off (if paid annually)

---

## 10. Terms & Conditions

### 10.1 Confidentiality

Both parties agree to keep confidential any proprietary information shared during the pilot, including:

- Provider: IntelGraph source code, architecture, roadmap
- Customer: Business data, use cases, feedback

### 10.2 Intellectual Property

- Provider retains all IP rights to IntelGraph platform
- Customer retains all IP rights to their data and use cases
- Feedback provided by Customer may be used by Provider to improve the platform

### 10.3 Liability

- Provider is not liable for data loss, business interruption, or indirect damages
- Provider's total liability is limited to $0 (no-cost pilot)
- Customer is responsible for backing up their data before pilot

### 10.4 Termination

Either party may terminate the pilot with 5 business days written notice. Upon termination:

- Provider will provide Customer's data in exportable format
- Provider will delete Customer's data within 30 days
- Both parties' confidentiality obligations continue for 2 years

---

## 11. Acceptance & Signatures

By signing below, both parties agree to the terms and conditions outlined in this Statement of Work.

**Provider**:

- Name: Brian Long
- Title: CEO
- Company: BrianCLong / IntelGraph
- Signature: **********\_\_\_\_**********
- Date: **********\_\_\_\_**********

**Customer**:

- Name: [CUSTOMER_NAME]
- Title: [CUSTOMER_TITLE]
- Company: [CUSTOMER_COMPANY]
- Signature: **********\_\_\_\_**********
- Date: **********\_\_\_\_**********

---

**Appendices**:

- Appendix A: Features→SOW Mapping Table (pilot/FEATURES_SOW_MAPPING.md)
- Appendix B: Value Metrics Tracking (pilot/VALUE_METRICS.md)
- Appendix C: Pilot Deployment Guide (docs/PILOT_DEPLOYMENT_GUIDE.md)
- Appendix D: Release Notes (docs/RELEASE_NOTES_2025.10.HALLOWEEN.md)

---

**Document Version**: 1.0
**Last Updated**: October 4, 2025
**Issue**: #10071
