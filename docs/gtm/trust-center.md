# Summit Trust Center

**Last Updated:** November 20, 2025

Welcome to the Summit Trust Center. Security, privacy, and compliance are foundational to everything we build.

---

## Security Overview

### Architecture Principles

**1. Zero Trust Architecture**
- All access requires authentication and authorization
- Policy-based access control (OPA/ABAC)
- Least privilege by default
- Continuous verification

**2. Defense in Depth**
- Network segmentation
- Application-layer security
- Data encryption (at-rest and in-transit)
- Audit logging for all operations

**3. AI-First, Human-in-Command**
- AI agents recommend, humans approve
- Explainable AI decisions
- Complete provenance for all AI actions
- Agent guardrails and policy enforcement

---

## Data Security

### Encryption

**Data at Rest:**
- AES-256 encryption for all stored data
- Database encryption (PostgreSQL TDE, Neo4j encryption)
- Encrypted backups
- Key management via AWS KMS, Azure Key Vault, or HashiCorp Vault

**Data in Transit:**
- TLS 1.3 for all network communication
- Mutual TLS (mTLS) for service-to-service communication
- Certificate rotation and management
- No plaintext protocols

**Data in Use:**
- Memory encryption (Intel SGX / AMD SEV where available)
- Secure enclaves for sensitive operations
- Credential scrubbing in logs and metrics

### Data Isolation

**Multi-Tenancy (White-Label Edition):**
- Database-level tenant isolation
- Row-level security (RLS) in PostgreSQL
- Graph-level isolation in Neo4j
- Separate encryption keys per tenant
- Policy-enforced data boundaries

**Access Control:**
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Fine-grained permissions
- Classification-based access (UNCLASSIFIED → SAP)

---

## Application Security

### Secure Development Lifecycle

**Design:**
- Threat modeling for all features
- Security requirements in user stories
- Architecture review for security implications

**Development:**
- Secure coding standards (OWASP Top 10)
- Static Application Security Testing (SAST)
- Dependency scanning (SBOM generation)
- Secret detection in code

**Testing:**
- Dynamic Application Security Testing (DAST)
- Penetration testing (quarterly)
- Fuzz testing for critical endpoints
- Security regression tests

**Deployment:**
- Immutable infrastructure
- Container scanning
- SLSA Level 3 build provenance
- Signed releases with notary

### Vulnerability Management

**Process:**
- Continuous vulnerability scanning
- Prioritized remediation (CVSS scoring)
- 7-day SLA for critical vulnerabilities
- 30-day SLA for high vulnerabilities
- Coordinated disclosure for security researchers

**Reporting:**
- Security advisory notifications
- Transparency reports (quarterly)
- CVE tracking and disclosure

**Bug Bounty:**
- Private bug bounty program (coming Q1 2026)
- Rewards up to $10,000 for critical findings

---

## Compliance & Certifications

### Current Status

| Standard | Status | Notes |
|----------|--------|-------|
| **SOC 2 Type I** | In Progress | Expected Q1 2026 (Hosted SaaS) |
| **SOC 2 Type II** | Planned | Expected Q3 2026 (Hosted SaaS) |
| **ISO 27001** | Planned | Expected Q2 2026 |
| **GDPR** | Compliant | Self-hosted: customer-controlled. SaaS: DPA available |
| **HIPAA** | Ready | BAA available for Enterprise customers |
| **CCPA** | Compliant | Privacy controls implemented |
| **FedRAMP** | Roadmap | Targeting 2027 |

### Framework Alignment

Summit's controls align with:
- NIST Cybersecurity Framework
- CIS Controls v8
- OWASP ASVS Level 2
- Cloud Security Alliance (CSA) STAR

---

## Privacy & Data Protection

### Data Processing

**What We Collect:**
- Account information (name, email, company)
- Usage telemetry (features used, performance metrics)
- Audit logs (who did what, when)
- Error logs (anonymized stack traces)

**What We Don't Collect:**
- Your business data (stays in your graph)
- End-user personal information
- Sensitive credentials (encrypted, never logged)

**Data Residency:**
- Internal/White-Label: You control where data lives
- Hosted SaaS: Choose US, EU, or APAC region
- No cross-region data transfer without consent

### AI & Machine Learning

**Model Training:**
- We do NOT train models on your data without explicit consent
- Agent insights generated from your graph stay in your graph
- Anonymous aggregate metrics only (opt-in)

**Third-Party AI Providers:**
- Support for OpenAI, Anthropic, Azure OpenAI, AWS Bedrock
- Zero Data Retention (ZDR) agreements with providers
- Bring-your-own-LLM (BYO-LLM) supported
- Local/on-prem model support

**Data Minimization:**
- AI agents only access data required for the task
- Policy-enforced data boundaries
- Automatic data anonymization for training (if opted-in)

### Your Rights (GDPR/CCPA)

- **Access:** Export all your data via API or UI
- **Rectification:** Update your information anytime
- **Erasure:** Delete your account and data (30-day retention for backups)
- **Portability:** Export data in JSON, CSV, or GraphML format
- **Object:** Opt-out of analytics and telemetry
- **Restrict:** Disable specific agents or features

**Data Retention:**
- Active data: Retained while account active
- Audit logs: 7 years (compliance requirement)
- Backups: 30 days
- Deleted data: Purged within 90 days

---

## Infrastructure Security

### Hosting (Hosted SaaS)

**Cloud Providers:**
- AWS (US, EU regions)
- GCP (APAC region)
- All tier-1 data centers with SOC 2, ISO 27001

**Infrastructure:**
- Kubernetes (EKS/GKE) for orchestration
- Managed databases (RDS, Cloud SQL)
- Object storage (S3, GCS) with versioning
- CDN (CloudFront) for static assets

**Monitoring:**
- 24/7 security operations center (SOC)
- Intrusion detection (IDS/IPS)
- Anomaly detection (ML-based)
- Automated incident response

### Disaster Recovery & Business Continuity

**Availability:**
- 99.9% uptime SLA (Hosted SaaS)
- Multi-AZ deployment
- Automated failover
- Load balancing and auto-scaling

**Backups:**
- Continuous replication
- Point-in-time recovery (PITR)
- Automated daily backups
- Geo-redundant storage

**Recovery Objectives:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Tested quarterly

---

## Incident Response

### Process

**Detection:**
- Automated alerting
- Security monitoring tools
- Customer reports (security@summit.com)

**Response:**
- Incident commander assigned
- Root cause analysis (RCA)
- Mitigation and remediation
- Post-mortem report

**Communication:**
- Customer notification within 24 hours (material breaches)
- Status page updates (status.summit.com)
- Detailed incident reports

**Recovery:**
- Service restoration
- Data integrity verification
- Lessons learned and improvements

### Security Incident History

No security incidents to report as of November 2025.

---

## Access & Authentication

### Identity Management

**Supported Providers:**
- SAML 2.0 (Okta, Azure AD, Google Workspace, OneLogin)
- OIDC (OpenID Connect)
- LDAP/Active Directory
- Username/password (with MFA)

**Multi-Factor Authentication:**
- TOTP (time-based one-time passwords)
- WebAuthn / FIDO2 (hardware keys)
- Push notifications (Duo, Okta)
- SMS (not recommended, but supported)

**Session Management:**
- Configurable session timeouts
- Automatic logout on inactivity
- Device fingerprinting
- IP allowlisting

### API Security

**Authentication:**
- API keys (scoped permissions)
- OAuth 2.0 (authorization code flow)
- JWT (JSON Web Tokens)
- mTLS (mutual TLS) for service accounts

**Rate Limiting:**
- Per-user: 1000 requests/hour
- Per-organization: 10,000 requests/hour
- Burst protection: 100 requests/minute

**Audit:**
- All API calls logged
- Request/response payloads (sanitized)
- IP address and user agent tracking

---

## Third-Party Security

### Vendor Management

**Selection Criteria:**
- SOC 2 / ISO 27001 certified
- Regular security audits
- Incident response plan
- Data processing agreements (DPA)

**Current Vendors:**
- Cloud providers: AWS, GCP
- Identity: Auth0, Okta
- Monitoring: Datadog, Sentry
- Communication: SendGrid, Twilio

**Vendor Reviews:**
- Annual security assessments
- Contract renewals require security review
- Vendor risk scoring

### Subprocessors (GDPR)

Full list of subprocessors available at: [summit.local/subprocessors](https://summit.local/subprocessors)

Customers notified 30 days before adding new subprocessors.

---

## Audit & Logging

### Audit Trail

**What We Log:**
- All user actions (create, read, update, delete)
- Agent actions (recommendations, executions, approvals)
- Authentication events (login, logout, MFA)
- Administrative changes (user management, policy updates)
- System events (deployments, configuration changes)

**Log Format:**
- Structured JSON
- Immutable (append-only)
- Cryptographically signed
- Tamper-evident

**Retention:**
- Real-time: 90 days (hot storage)
- Historical: 7 years (cold storage)
- Compliance: Configurable per regulation

**Export:**
- SIEM integration (Splunk, Sentinel, Chronicle)
- API access for custom analysis
- CSV/JSON export via UI

---

## Penetration Testing

**Frequency:**
- Quarterly penetration tests by third-party firms
- Annual red team exercises
- Continuous bug bounty program (Q1 2026)

**Scope:**
- Web application
- APIs
- Infrastructure
- Social engineering (opt-in)

**Remediation:**
- Critical findings: 7 days
- High findings: 30 days
- Medium/Low: Next release

**Reports:**
- Executive summary available to customers
- Full report available under NDA

---

## Employee Security

### Background Checks

- Criminal background checks (US/EU)
- Employment verification
- Reference checks
- Ongoing monitoring

### Security Training

- Onboarding security training (mandatory)
- Annual security awareness training
- Phishing simulations (quarterly)
- Secure coding training (engineering)

### Access Control

- Least privilege access
- Just-in-time (JIT) access for production
- MFA required for all systems
- Access review (quarterly)

---

## Customer Security Responsibilities

### Shared Responsibility Model

| Layer | Summit | Customer |
|-------|--------|----------|
| **Application** | Code security, vulnerability management | Secure configuration, user management |
| **Data** | Encryption, backup | Classification, access control policies |
| **Network** | Infrastructure security, DDoS protection | Firewall rules (self-hosted), VPN config |
| **Identity** | SSO integration, MFA | User provisioning, role management |
| **Compliance** | Controls, audits (SaaS) | Policy enforcement, internal audits |

### Best Practices

**1. Strong Authentication:**
- Require MFA for all users
- Use SSO with your identity provider
- Rotate API keys regularly

**2. Principle of Least Privilege:**
- Assign minimal permissions needed
- Use role-based access control
- Review permissions quarterly

**3. Monitor and Alert:**
- Enable audit log exports
- Set up alerting for suspicious activity
- Regular security reviews

**4. Classify Your Data:**
- Tag sensitive entities in the graph
- Configure classification-based policies
- Limit AI agent access to sensitive data

**5. Keep Updated (Self-Hosted):**
- Apply security patches within 7 days
- Subscribe to security advisories
- Test updates in staging first

---

## Security Contact

**Report a Vulnerability:**
- Email: [security@summit.com](mailto:security@summit.com)
- PGP Key: [Download](https://summit.local/security/pgp.asc)
- Response SLA: 24 hours

**Security Questions:**
- Email: [security@summit.com](mailto:security@summit.com)
- Trust Center: [summit.local/trust](https://summit.local/trust)
- Status Page: [status.summit.com](https://status.summit.com)

---

## Transparency & Reporting

### Security Advisories

Subscribe to security updates: [summit.local/security/advisories](https://summit.local/security/advisories)

### Transparency Reports

Quarterly reports on:
- Vulnerabilities disclosed and remediated
- Uptime and availability
- Penetration test summaries
- Compliance audit results

### Open Source

Summit is built on open standards and contributes back:
- SBOM (Software Bill of Materials) published for all releases
- Connectors open-sourced: [github.com/summitco/connectors](https://github.com/summitco/connectors)
- Policy examples: [github.com/summitco/policies](https://github.com/summitco/policies)

---

## Certifications & Attestations

### Coming Soon

- SOC 2 Type I (Q1 2026)
- SOC 2 Type II (Q3 2026)
- ISO 27001 (Q2 2026)
- PCI DSS (2027, if handling payments)

### Available Now

- GDPR compliance documentation
- HIPAA BAA (Business Associate Agreement)
- DPA (Data Processing Agreement)
- Security questionnaire responses

**Request Compliance Docs:**
[compliance@summit.com](mailto:compliance@summit.com)

---

*This Trust Center is updated regularly. For questions or additional information, contact our security team at security@summit.com.*
