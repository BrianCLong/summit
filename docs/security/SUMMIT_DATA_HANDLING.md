# Summit Data Handling & Privacy Policy

**Version:** 1.0
**Target:** Summit Agentic AI OSINT Platform

## 1. Data Classification
Summit uses a tiered classification system to protect assets and sensitive information.

### Tier 0: Critical (Restricted)
*   **Description**: Assets that, if compromised, would cause catastrophic harm (e.g., total loss of customer trust).
*   **Examples**: Credentials, master private keys, financial data, raw customer PII (SSN, identifiers).
*   **Controls**: Maximum protection, MFA required, four-eyes principle for access, and continuous auditing.

### Tier 1: Sensitive (Confidential)
*   **Description**: Essential business data where compromise is painful but recoverable.
*   **Examples**: Investigation reports, specific knowledge graph entities, internal strategy docs.
*   **Controls**: High protection, standard MFA, and need-to-know access controls.

### Tier 2: Internal
*   **Description**: Standard internal data for day-to-day operations.
*   **Examples**: Internal wikis, development test data, general system telemetry.
*   **Controls**: Standard authentication and logging.

## 2. PII Handling & Privacy Controls

### 2.1 Automatic Redaction
Summit automatically identifies and masks Personally Identifiable Information (PII) to minimize risk.

*   **Identified Patterns**: Emails, phone numbers, SSNs, and specific identifiers.
*   **Mechanism**: Data is redacted in real-time as it is ingested, and before it reaches logs or non-sensitive UI views.

### 2.2 Data Residency & Multi-Tenancy
*   **Logical Isolation**: Data for each tenant is logically separated using strict `tenantId` enforcement in all database layers.
*   **Residency**: Customer data can be pinned to specific geographic regions (e.g., US, EU) based on tenant configuration.

## 3. Encryption at Rest & Transit

### 3.1 Encryption at Rest
*   **Database**: PostgreSQL and Neo4j data is encrypted using AES-256-GCM.
*   **Key Management**: Keys are managed via AWS KMS or HashiCorp Vault, with mandatory rotation every 90 days.
*   **Backups**: All database backups and snapshots are encrypted with unique keys.

### 3.2 Encryption in Transit
*   **TLS 1.3**: All external communication (client-to-server) is protected with TLS 1.3.
*   **mTLS**: Internal service-to-service communication within the Summit cluster is mutually authenticated (mTLS) to ensure identity and confidentiality.

## 4. Data Retention & Deletion

*   **Audit Logs**: Retained for 1 year in secure, immutable storage.
*   **Security Logs**: Retained for 90 days with daily digests sent to security operators.
*   **Customer Deletion**: Upon tenant termination, all customer-specific data is cryptographically erased (crypto-shredded) within 30 days.

## 5. Related Documentation
*   [Asset Classification Policy](./ASSET_CLASSIFICATION.md)
*   [Security Guidelines](./SECURITY_GUIDELINES.md)
*   [DLP Information Barriers](./DLP-INFORMATION-BARRIERS-V0.md)
