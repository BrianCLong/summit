# Summit Compliance & Trust Fact Sheet

**For Security Reviewers, Compliance Officers, and Procurement Teams**

_Version: 2025-11-27 | Classification: UNCLASSIFIED_

---

## Purpose

This document provides a concise reference for security and compliance reviewers evaluating Summit for deployment in government, defense, or regulated enterprise environments.

---

## 1. Supply Chain Security

### Software Bill of Materials (SBOM)

| Item | Status | Notes |
|------|--------|-------|
| SBOM Generation | **Implemented** | CycloneDX and SPDX formats |
| Automated Updates | **Implemented** | Generated on every release |
| Dependency Scanning | **Implemented** | Trivy, Snyk integration |
| Vulnerability Alerting | **Implemented** | CVE monitoring with SLA response |

**Location:** `SECURITY/sbom/` in repository; available on request per release.

### SLSA (Supply-chain Levels for Software Artifacts)

| Level | Status | Evidence |
|-------|--------|----------|
| SLSA Level 1 | **Achieved** | Documented build process |
| SLSA Level 2 | **Achieved** | Hosted source/build, signed provenance |
| SLSA Level 3 | **In Progress** | Hardened build platform; target Q1 2026 |

**Attestation:** Build provenance attestations available; see `SECURITY/slsa/`.

---

## 2. Access Control & Authorization

### ABAC via Open Policy Agent (OPA)

| Capability | Implementation |
|------------|----------------|
| Attribute-Based Access Control | OPA policies enforce user attributes, data classification, context |
| Policy-as-Code | Rego policies version-controlled; auditable change history |
| Multi-Tenant Isolation | Tenant boundaries enforced at policy layer |
| Dynamic Policy Updates | Hot-reload without service restart |

**Policy Packs Available:**
- Government Baseline (classification, need-to-know, compartments)
- Enterprise Standard (role + department + data sensitivity)
- Custom (built to customer requirements during pilot)

### Role-Based Presets

| Role | Default Permissions | Customizable |
|------|---------------------|--------------|
| Analyst | Read data, run queries, create cases | Yes |
| Supervisor | Analyst + approve, export, manage team | Yes |
| Administrator | Full platform management | Yes |
| Auditor | Read-only, full audit log access | Yes |

---

## 3. Data Handling & Privacy

### Classification & Tagging

| Feature | Status |
|---------|--------|
| Data classification labels | **Implemented** (configurable taxonomy) |
| Automated classification hints | **Implemented** (pattern-based) |
| Manual override with audit | **Implemented** |
| Label inheritance (derived data) | **Implemented** |

### Data Loss Prevention (DLP)

| Capability | Status |
|------------|--------|
| Content inspection hooks | **Implemented** |
| Egress controls | **Implemented** (policy-based) |
| Redaction modes | **Implemented** (pattern-based, manual) |
| Alert on policy violation | **Implemented** |

### Privacy Modes

| Mode | Description |
|------|-------------|
| Standard | Full data visibility per access policy |
| Minimized | PII/sensitive fields masked by default |
| Anonymized | Aggregated views only; no individual records |

### Data Residency

| Deployment | Data Residency Options |
|------------|------------------------|
| Cloud | US-only (AWS GovCloud, Azure Gov); EU; customer-specified region |
| On-Premises | Customer-controlled; no data egress to Summit |
| Air-Gapped | Fully disconnected; no external network dependencies |

---

## 4. Audit & Provenance

### Audit Logging

| Log Type | Retention | Format | Export |
|----------|-----------|--------|--------|
| Authentication events | Configurable (default 1 year) | JSON/SIEM-compatible | Yes |
| Authorization decisions | Configurable (default 1 year) | JSON/SIEM-compatible | Yes |
| Data access | Configurable (default 1 year) | JSON/SIEM-compatible | Yes |
| Data modifications | Configurable (default 2 years) | JSON/SIEM-compatible | Yes |
| Query history | Configurable (default 1 year) | JSON/SIEM-compatible | Yes |

### Chain-of-Custody (Provenance)

| Capability | Status |
|------------|--------|
| Source attribution | Every data element traced to ingestion source |
| Transformation tracking | Derived data linked to parent sources |
| User action attribution | All modifications tied to authenticated user |
| Timestamp integrity | Tamper-evident timestamps |
| Export packages | Exportable provenance bundles for evidence |

**Evidence Format:** Provenance graphs exportable as JSON-LD, STIX bundles, or PDF reports.

---

## 5. Encryption & Key Management

### Data at Rest

| Layer | Encryption | Key Management |
|-------|------------|----------------|
| Database (Neo4j) | AES-256 | Platform-managed or BYOK |
| Database (PostgreSQL) | AES-256 | Platform-managed or BYOK |
| Object Storage | AES-256 | Platform-managed or BYOK |
| Backups | AES-256 | Separate key hierarchy |

### Data in Transit

| Channel | Encryption |
|---------|------------|
| External APIs | TLS 1.3 (minimum 1.2) |
| Internal services | mTLS |
| Database connections | TLS required |

### Bring Your Own Key (BYOK)

| Capability | Status |
|------------|--------|
| Customer-managed keys (CMK) | **Supported** |
| HSM integration | **Supported** (AWS CloudHSM, Azure HSM, on-prem HSM) |
| Key rotation | **Supported** (automated or manual) |
| Key escrow | Customer option; not required |

---

## 6. Regulatory & Framework Alignment

### Federal

| Framework | Status | Notes |
|-----------|--------|-------|
| FedRAMP | **High Baseline Path** | SSP in development; target authorization 2026 |
| FISMA | **Control Documentation Available** | Inheritance model for customer ATOs |
| CMMC | **Level 2 Ready** | Controls mapped; CUI handling implemented |
| IL4 | **Architecture Supports** | Deployment in authorized environments |
| IL5 | **Architecture Supports** | Requires customer-authorized environment |
| ITAR/EAR | **Export Control Compliant** | US-only deployment options; personnel screening |

### Industry

| Framework | Status | Notes |
|-----------|--------|-------|
| SOC 2 Type II | **In Progress** | Target completion Q1 2026 |
| ISO 27001 | **Controls Mapped** | Certification timeline TBD |
| HIPAA | **Technical Safeguards Ready** | BAA available |
| PCI-DSS | **Not in Scope** | Platform does not process payment data |
| GDPR | **Data Subject Rights Supported** | EU deployment option; DPA available |

---

## 7. Vulnerability Management

### Scanning & Testing

| Activity | Frequency | Tools |
|----------|-----------|-------|
| Dependency scanning | Every build | Trivy, Snyk |
| Container scanning | Every build | Trivy |
| Static analysis (SAST) | Every PR | CodeQL, Semgrep |
| Dynamic analysis (DAST) | Weekly | ZAP |
| Penetration testing | Annual + major releases | Third-party |

### Remediation SLAs

| Severity | SLA |
|----------|-----|
| Critical | 24 hours |
| High | 7 days |
| Medium | 30 days |
| Low | 90 days |

### Disclosure

Responsible disclosure policy published; security contact available.

---

## 8. Deployment Security

### Container Security

| Control | Status |
|---------|--------|
| Minimal base images | **Implemented** (distroless where possible) |
| Non-root execution | **Implemented** |
| Read-only filesystems | **Implemented** (where applicable) |
| Resource limits | **Implemented** |
| Network policies | **Implemented** (Kubernetes NetworkPolicy) |

### Infrastructure Patterns

| Deployment | Security Controls |
|------------|-------------------|
| Cloud (GovCloud) | Private VPC, security groups, IAM roles, encryption |
| On-Premises | Customer firewall, no inbound from internet, encrypted storage |
| Air-Gapped | Fully isolated network; offline updates via secure media |

---

## 9. Incident Response

| Capability | Status |
|------------|--------|
| Incident response plan | **Documented** |
| 24/7 on-call | **Available** (enterprise/gov contracts) |
| Customer notification SLA | **< 24 hours** for confirmed incidents |
| Post-incident reports | **Provided** within 5 business days |
| Tabletop exercises | **Annual** |

---

## 10. Documentation & Evidence

### Available on Request

| Document | Format |
|----------|--------|
| SBOM (current release) | CycloneDX, SPDX |
| SLSA attestation | JSON |
| Architecture diagram | PDF, Visio |
| Data flow diagram | PDF, Visio |
| Control inheritance matrix | Excel |
| Audit log samples | JSON |
| Penetration test summary | PDF (redacted) |
| SOC 2 Type II report | PDF (when available) |

### Repository Locations

- `SECURITY/` — Security policies, SBOM, SLSA attestations
- `docs/COMPLIANCE.md` — Compliance overview
- `docs/privacy/` — Privacy and data handling documentation
- `docs/THREAT_MODEL_STRIDE.md` — Threat model
- `docs/SOC2_AUDITOR_PACKET.md` — SOC 2 evidence index

---

## 11. Contact

**Security & Compliance Inquiries:**
[Security Contact Name]
[security@summit.example]

**Compliance Documentation Requests:**
[Compliance Contact Name]
[compliance@summit.example]

---

_This fact sheet is intended for security and compliance evaluation purposes. Specific control implementations may vary by deployment pattern and customer requirements. Contact Summit for detailed technical security documentation._
