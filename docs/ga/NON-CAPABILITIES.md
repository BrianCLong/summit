# GA Non-Capabilities

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **Status**: Production
> **Audience**: Product Managers, Engineers, Customers

## Table of Contents

1. [Purpose of This Document](#purpose-of-this-document)
2. [Non-Capability Statements](#non-capability-statements)
3. [Scope Limitations](#scope-limitations)
4. [Out-of-Scope Use Cases](#out-of-scope-use-cases)
5. [Alternative Solutions](#alternative-solutions)

---

## Purpose of This Document

This document explicitly states what the **Governance & Attestation (GA)** system **does NOT do**. Clearly defining non-capabilities is critical for:

1. **Setting Expectations**: Preventing misunderstandings about system functionality
2. **Scope Management**: Avoiding scope creep and feature bloat
3. **Security Clarity**: Ensuring users understand security boundaries
4. **Alternative Guidance**: Directing users to appropriate solutions for out-of-scope needs

### Why Explicit Non-Capabilities Matter

**Problem**: Stakeholders often assume capabilities that were never designed or intended.

**Example**: A user might assume GA can:

- "Automatically classify data based on content" (ML-based classification)
- "Prevent data exfiltration at the network layer" (DLP)
- "Provide real-time threat detection" (SIEM)

**Reality**: GA is a **policy-driven access control and provenance verification system**. It does NOT provide ML classification, network DLP, or threat detection.

**This document prevents such misunderstandings.**

---

## Non-Capability Statements

### 1. GA Does NOT Perform Automatic Data Classification

**What Users Might Expect**:

- Upload a document and have GA automatically assign classification (U, C, S, TS)
- Scan text content for keywords and auto-classify

**Reality**:

- GA **enforces** classification-based access control
- GA does **NOT automatically classify** data
- Data owners must manually classify resources

**Why Not**:

- Automatic classification requires ML models trained on classified data
- IC regulations prohibit automated classification without human review
- False positives/negatives are unacceptable for TS/SCI data

**Alternative**:

- Use external classification tools (e.g., Titus, Boldon James)
- Integrate with IC-approved classification engines
- Require data owners to classify during ingest

---

### 2. GA Does NOT Provide Network-Level Data Loss Prevention (DLP)

**What Users Might Expect**:

- Block users from copying classified data to USB drives
- Prevent screenshots of classified information
- Intercept network traffic containing sensitive data

**Reality**:

- GA **enforces** export policies at the API layer
- GA does **NOT monitor** network traffic or endpoints
- GA does **NOT prevent** client-side data exfiltration

**Why Not**:

- Network DLP requires deep packet inspection (DPI)
- Endpoint DLP requires agent installation on user devices
- GA operates at the application layer, not network/endpoint layer

**Alternative**:

- Deploy network DLP solutions (e.g., Symantec DLP, Forcepoint)
- Use endpoint protection platforms (EPP) with DLP capabilities
- Implement CASB (Cloud Access Security Broker) for cloud DLP

---

### 3. GA Does NOT Detect Insider Threats

**What Users Might Expect**:

- Identify users with anomalous access patterns
- Detect malicious insiders attempting data theft
- Alert on suspicious behavior (e.g., mass downloads)

**Reality**:

- GA **logs** all access decisions in an audit trail
- GA does **NOT analyze** patterns for anomalies
- GA does **NOT generate** threat intelligence

**Why Not**:

- Threat detection requires behavioral analytics (UEBA)
- GA focuses on policy enforcement, not anomaly detection
- SIEM/SOAR tools are purpose-built for threat detection

**Alternative**:

- Integrate GA audit logs with SIEM (Splunk, ELK, QRadar)
- Use UEBA tools (e.g., Exabeam, Securonix) for insider threat detection
- Implement anomaly detection on top of GA audit data

---

### 4. GA Does NOT Encrypt Data

**What Users Might Expect**:

- Automatically encrypt data at rest
- Provide end-to-end encryption (E2EE) for data in transit
- Manage encryption keys

**Reality**:

- GA **verifies** cryptographic signatures (attestations)
- GA does **NOT encrypt** data payloads
- GA does **NOT manage** encryption keys

**Why Not**:

- Data encryption is the responsibility of storage/database layers
- GA operates on metadata (classification, provenance), not payloads
- Key management is a separate concern (use KMS)

**Alternative**:

- Use database-level encryption (PostgreSQL TDE, Neo4j encryption)
- Implement application-layer encryption (AES-256-GCM)
- Use cloud KMS (AWS KMS, Azure Key Vault, GCP KMS)

---

### 5. GA Does NOT Provide Real-Time Alerting

**What Users Might Expect**:

- Instant notifications when access is denied
- Real-time dashboards of policy violations
- Slack/email alerts for governance events

**Reality**:

- GA **logs** decisions to an audit trail (asynchronous)
- GA does **NOT send** real-time alerts
- Audit logs can be queried, but not streamed in real-time

**Why Not**:

- Real-time alerting requires event streaming (Kafka, Kinesis)
- GA prioritizes low-latency policy evaluation over alerting
- Alerting is better handled by downstream SIEM/observability tools

**Alternative**:

- Ship GA audit logs to SIEM for real-time alerting
- Use Prometheus/Grafana for metrics-based alerts
- Implement webhook/SNS notifications on top of GA audit API

---

### 6. GA Does NOT Perform Content Scanning or Malware Detection

**What Users Might Expect**:

- Scan uploaded files for malware
- Detect sensitive data (SSNs, credit cards) in documents
- Block files containing prohibited content

**Reality**:

- GA **verifies** provenance and signatures
- GA does **NOT scan** file contents
- GA does **NOT detect** malware or sensitive data

**Why Not**:

- Content scanning requires antivirus engines (ClamAV, VirusTotal)
- Sensitive data detection requires regex/ML (DLP tools)
- GA focuses on access control, not content analysis

**Alternative**:

- Use antivirus scanning at ingest (ClamAV, VirusTotal API)
- Implement DLP scanning for sensitive data (Macie, Cloud DLP)
- Integrate with content analysis services before GA evaluation

---

### 7. GA Does NOT Manage User Identities or Credentials

**What Users Might Expect**:

- Create/update/delete user accounts
- Reset passwords
- Manage MFA tokens

**Reality**:

- GA **consumes** user identities (from OIDC/LDAP)
- GA does **NOT manage** user lifecycle
- GA does **NOT store** credentials

**Why Not**:

- Identity management is the responsibility of IdP (Okta, Azure AD, Keycloak)
- GA is stateless with respect to user identities
- GA trusts the IdP to provide accurate identity claims

**Alternative**:

- Use dedicated IdP for user management
- Integrate GA with existing LDAP/AD infrastructure
- Implement SCIM for user provisioning

---

### 8. GA Does NOT Provide Data Lineage Visualization

**What Users Might Expect**:

- Visual graph of data transformations (A → B → C)
- Interactive lineage explorer
- Impact analysis (what depends on this data?)

**Reality**:

- GA **stores** provenance chain (append-only ledger)
- GA does **NOT visualize** lineage
- GA provides raw provenance data via API

**Why Not**:

- Lineage visualization requires graph rendering (D3.js, Cytoscape)
- GA focuses on verification, not presentation
- Visualization is better handled by dedicated tools

**Alternative**:

- Build custom lineage UI on top of GA provenance API
- Use data catalog tools (Amundsen, DataHub, Alation)
- Integrate with graph visualization libraries

---

### 9. GA Does NOT Support Fine-Grained Field-Level Redaction

**What Users Might Expect**:

- Redact specific fields in a JSON document (e.g., SSN)
- Show partial data (e.g., last 4 digits of SSN)
- Field-level access control (user can see name but not SSN)

**Reality**:

- GA **redacts entire resources** based on classification
- GA does **NOT support** field-level redaction
- GA provides all-or-nothing access to a resource

**Why Not**:

- Field-level redaction requires schema-aware policies
- Complexity explodes with nested/dynamic schemas
- Performance impact of per-field evaluation

**Alternative**:

- Implement field-level redaction at application layer
- Use GraphQL field-level directives (@auth, @redact)
- Store sensitive fields in separate tables/nodes

---

### 10. GA Does NOT Provide Multi-Tenancy Isolation at the Database Level

**What Users Might Expect**:

- Separate databases per tenant
- Physical isolation of tenant data
- Tenant-specific encryption keys

**Reality**:

- GA **enforces** tenant isolation via policies
- GA does **NOT provide** database-level isolation
- All tenants share the same database (logical isolation)

**Why Not**:

- Database-level isolation is expensive (N databases for N tenants)
- GA provides IC-grade logical isolation (see [IC-MULTI-TENANCY.md](../../SECURITY/docs/IC-MULTI-TENANCY.md))
- Physical isolation is overkill for most use cases

**Alternative**:

- Use logical isolation (tenant ID in policies)
- Implement row-level security (RLS) in PostgreSQL
- Use separate database instances for high-security tenants

---

### 11. GA Does NOT Support Role Mining or Policy Recommendation

**What Users Might Expect**:

- Analyze access patterns and suggest optimal roles
- Recommend policy changes based on user behavior
- Auto-generate policies from historical data

**Reality**:

- GA **enforces** static policies (defined by policy authors)
- GA does **NOT analyze** access patterns
- GA does **NOT recommend** policy changes

**Why Not**:

- Policy recommendation requires ML on audit data
- IC security mandates human review of policy changes
- Automated policy changes are too risky

**Alternative**:

- Implement role mining in separate analytics pipeline
- Use ML tools on GA audit logs for recommendations
- Provide policy authoring UI with suggested rules (human-approved)

---

### 12. GA Does NOT Provide Real-Time Policy Updates

**What Users Might Expect**:

- Update policy and have it take effect instantly (< 1s)
- Zero-downtime policy rollouts
- A/B testing of policies

**Reality**:

- GA **refreshes** policy bundles every 60 seconds
- GA does **NOT support** instant policy updates
- Policy changes have up to 60s propagation delay

**Why Not**:

- Instant propagation requires distributed consensus (complex, slow)
- 60s is acceptable for most use cases
- Emergency policy updates can trigger manual refresh

**Alternative**:

- Accept 60s propagation delay (design around it)
- Trigger manual policy refresh for emergency changes
- Use feature flags for gradual policy rollout

---

### 13. GA Does NOT Provide Data Residency Enforcement

**What Users Might Expect**:

- Ensure data stays in specific geographic regions (GDPR, CCPA)
- Block cross-region data access
- Verify data storage location

**Reality**:

- GA **logs** data access location (IP address)
- GA does **NOT enforce** data residency
- GA does **NOT control** where data is stored

**Why Not**:

- Data residency is a deployment/infrastructure concern
- GA operates at the application layer, not storage layer
- Use geo-distributed databases for residency

**Alternative**:

- Deploy GA in specific regions (EU, US, APAC)
- Use geo-fencing in network policies
- Implement residency checks in application logic

---

### 14. GA Does NOT Support Time-Travel Queries

**What Users Might Expect**:

- Query historical state of data (what did entity X look like on 2025-01-01?)
- Restore deleted data
- Audit trail of data changes

**Reality**:

- GA **logs** access decisions (not data changes)
- GA does **NOT version** data
- GA does **NOT support** time-travel queries

**Why Not**:

- Time-travel requires versioned storage (PostgreSQL temporal tables, Datomic)
- GA audit logs are immutable but don't snapshot data
- Data versioning is a database concern, not GA concern

**Alternative**:

- Use database-level versioning (PostgreSQL temporal tables)
- Implement event sourcing for full history
- Store snapshots in separate archive

---

### 15. GA Does NOT Provide Self-Service Policy Authoring UI

**What Users Might Expect**:

- Visual policy builder (drag-and-drop)
- No-code policy creation
- Policy templates and wizards

**Reality**:

- GA **enforces** policies written in Rego (code)
- GA does **NOT provide** a UI for policy authoring
- Policies are authored in Git (version control)

**Why Not**:

- Visual policy builders are complex and error-prone
- IC security requires peer review of policy changes (Git workflow)
- Code-based policies are more expressive and testable

**Alternative**:

- Provide policy templates in Git repository
- Document common policy patterns
- Build custom UI for policy authoring (future enhancement)

---

## Scope Limitations

### Temporal Scope

**GA is designed for:**

- ✅ Real-time access control (< 10ms policy evaluation)
- ✅ Recent audit log queries (90 days hot storage)

**GA is NOT designed for:**

- ❌ Historical data analysis (7-year audit retention is for compliance, not analytics)
- ❌ Long-term trend analysis (use SIEM or data warehouse)

### Scale Scope

**GA is designed for:**

- ✅ 10,000 users
- ✅ 1 million entities
- ✅ 100,000 policy evaluations/second

**GA is NOT designed for:**

- ❌ 1 billion users (use federated policy engines)
- ❌ 1 trillion entities (use sharded databases)
- ❌ 10 million policy evaluations/second (use edge-side policy evaluation)

### Complexity Scope

**GA is designed for:**

- ✅ Classification-based access control (U, C, S, TS)
- ✅ Role-based access control (RBAC)
- ✅ Attribute-based access control (ABAC)

**GA is NOT designed for:**

- ❌ Relationship-based access control (ReBAC) at scale
- ❌ Graph-based access control (e.g., access determined by social network)
- ❌ Context-aware access control (e.g., location, device, biometrics)

---

## Out-of-Scope Use Cases

### Use Case 1: Consumer-Grade Privacy Compliance (GDPR, CCPA)

**Scenario**: A consumer-facing app needs to comply with GDPR right-to-be-forgotten requests.

**Why Out of Scope**:

- GA is designed for IC/enterprise use cases, not consumer privacy
- GDPR requires data deletion, but GA audit logs are immutable
- GA does not track user consent

**Alternative**:

- Use dedicated privacy management platforms (OneTrust, TrustArc)
- Implement consent management separately
- Anonymize user data in audit logs (hash user IDs)

---

### Use Case 2: Payment Card Industry (PCI) Compliance

**Scenario**: An e-commerce app needs to protect credit card data (PCI-DSS).

**Why Out of Scope**:

- GA does not scan or redact credit card numbers
- GA does not encrypt cardholder data
- PCI-DSS requires specific controls (tokenization, HSM)

**Alternative**:

- Use payment gateways (Stripe, Braintree) for PCI compliance
- Implement tokenization for credit card storage
- Use PCI-compliant hosting providers

---

### Use Case 3: Healthcare Data (HIPAA)

**Scenario**: A healthcare app needs to protect patient health information (PHI).

**Why Out of Scope**:

- GA does not automatically classify PHI
- GA does not provide patient consent management
- HIPAA requires specific audit log retention (6 years)

**Alternative**:

- Use healthcare-specific access control (Epic, Cerner)
- Implement HIPAA-compliant audit logging
- Deploy GA in HIPAA-compliant environment (AWS HIPAA, Azure Healthcare)

---

### Use Case 4: Public Records and FOIA Requests

**Scenario**: A government agency needs to redact documents for FOIA requests.

**Why Out of Scope**:

- GA does not redact document contents
- GA does not support exemption-based redaction (b1, b2, etc.)
- FOIA redaction is a manual, legal process

**Alternative**:

- Use document redaction tools (Adobe Redaction, GoldFynch)
- Implement manual redaction workflow
- Integrate with FOIA case management systems

---

### Use Case 5: Blockchain-Based Provenance

**Scenario**: A supply chain app needs immutable provenance on a blockchain.

**Why Out of Scope**:

- GA uses append-only PostgreSQL, not blockchain
- GA is centralized, not decentralized
- Blockchain is overkill for most use cases (slow, expensive)

**Alternative**:

- Use blockchain platforms (Hyperledger, Ethereum) if truly needed
- Integrate GA audit logs with blockchain (periodic anchoring)
- Use simpler immutable ledgers (QLDB, Immudb)

---

## Alternative Solutions

| Requirement                  | GA Capability | Alternative Solution                         |
| ---------------------------- | ------------- | -------------------------------------------- |
| **Automatic Classification** | ❌ None       | Titus, Boldon James, Azure Purview           |
| **Network DLP**              | ❌ None       | Symantec DLP, Forcepoint, Netskope           |
| **Threat Detection**         | ❌ None       | Splunk, ELK, QRadar, CrowdStrike             |
| **Data Encryption**          | ❌ None       | AWS KMS, Azure Key Vault, HashiCorp Vault    |
| **Real-Time Alerting**       | ❌ None       | PagerDuty, Opsgenie, Grafana Alerts          |
| **Malware Scanning**         | ❌ None       | ClamAV, VirusTotal, Sophos                   |
| **Identity Management**      | ❌ None       | Okta, Azure AD, Keycloak                     |
| **Lineage Visualization**    | ❌ None       | Amundsen, DataHub, Alation                   |
| **Field-Level Redaction**    | ❌ None       | Application logic, GraphQL directives        |
| **Database-Level Isolation** | ❌ None       | Separate databases, RLS                      |
| **Policy Recommendation**    | ❌ None       | Custom ML on audit logs                      |
| **Instant Policy Updates**   | ❌ None       | Accept 60s delay, manual refresh             |
| **Data Residency**           | ❌ None       | Geo-distributed deployment, network policies |
| **Time-Travel Queries**      | ❌ None       | PostgreSQL temporal tables, event sourcing   |
| **Self-Service Policy UI**   | ❌ None       | Custom UI (future), policy templates         |

---

## Summary

The GA system is a **focused, purpose-built solution** for:

- ✅ Policy-driven access control (OPA)
- ✅ Provenance verification (cryptographic signatures)
- ✅ Human-in-the-loop approvals
- ✅ Immutable audit trails

It is **NOT** a general-purpose security platform. For capabilities outside GA's scope, use dedicated tools and integrate them with GA where appropriate.

**Key Takeaway**: GA does one thing well: **governance**. Don't expect it to do everything.

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [Governance Design](./GOVERNANCE-DESIGN.md)
- [API Reference](./API-REFERENCE.md)

---

**Document Control**:

- **Version**: 1.0
- **Last Reviewed**: 2025-12-27
- **Next Review**: 2026-03-27
- **Owner**: Product Management
- **Approvers**: CTO, CISO, Product Lead
