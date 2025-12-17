# CompanyOS Privacy Controls Model v0

## 1. Privacy Taxonomy

The privacy taxonomy defines how data is classified, labeled, and handled within CompanyOS. It is implemented in `server/src/pii/taxonomy.ts` and `server/src/pii/sensitivity.ts`.

### 1.1 Classification Levels

We use a 4-tier severity model mapped to 5 sensitivity classes:

| Severity | Sensitivity Class | Description | Examples |
|----------|------------------|-------------|----------|
| **Low** | `INTERNAL` | Internal business data, low risk if leaked. | Internal IDs, metadata, logs (sanitized). |
| **Medium** | `CONFIDENTIAL` | PII that requires protection but isn't critical. | Name, Gender, Job Title. |
| **High** | `HIGHLY_SENSITIVE` | PII that can cause harm if leaked. | Email, Phone, Home Address, IP. |
| **Critical**| `TOP_SECRET` | Data causing severe harm or legal liability. | SSN, Credit Card, Health Records, Biometrics. |
| **None** | `PUBLIC` | Publicly available data. | Public press releases, open catalog data. |

### 1.2 Data Categories

Data is grouped into functional categories for policy application:

- **Identity**: Core attributes identifying a person (`identity.core`, `identity.credentials`).
- **Financial**: Banking, cards, transactions (`financial.accounts`).
- **Health**: Medical records, insurance, biometrics (`health.records`).
- **Contact**: Direct communication channels (`contact.direct`).
- **Location**: Physical and geospatial location (`location.address`).
- **Network**: Digital identifiers (`network`).

### 1.3 Data Uses & Flows

| Use Case | Allowed Data | Restrictions |
|----------|--------------|--------------|
| **Operations** | All | Only as required for the specific function. |
| **Support** | Medium/High | Critical PII masked by default. "Break-glass" available. |
| **Analytics** | Low/Medium | High/Critical must be aggregated or pseudonymized. |
| **ML Training**| Low | No PII allowed. Synthetic data preferred. |
| **Marketing** | Contact | Requires explicit consent (opt-in). |

---

## 2. Minimization & Protection Mechanisms

We enforce privacy by design through automated mechanisms in the ingestion and access layers.

### 2.1 Minimization Strategies

1.  **Ingestion Filtering**: The `IngestionHook` (`server/src/pii/ingestionHooks.ts`) scans all incoming data.
    -   **Redaction**: High/Critical PII can be redacted at the source if not needed.
    -   **Blocking**: Ingestion can be blocked if Critical PII is detected in non-secure pipelines.
2.  **Retention Policies**: Defined in `RetentionPolicy` (`server/src/pii/sensitivity.ts`).
    -   **Auto-Deletion**: PII is automatically deleted after the retention period (e.g., 3 years for Confidential).
    -   **Ephemeral Storage**: Sensitive PII in logs is never stored; it is scrubbed by the logger.

### 2.2 Protection at Rest & in Transit

1.  **Encryption**:
    -   All High/Critical data is encrypted at rest (`AES-256` or `KMS`).
    -   All data in transit is encrypted (`TLS 1.2+`).
2.  **Pseudonymization**:
    -   User IDs are UUIDs, not emails.
    -   Analytical datasets use hashed identifiers (salt + hash).

### 2.3 Access Control & Redaction

The `RedactionMiddleware` (`server/src/pii/redactionMiddleware.ts`) enforces view-time protection:

-   **Role-Based Masking**:
    -   `VIEWER`: Sees `***` for most PII.
    -   `ANALYST`: Sees partial data (e.g., last 4 digits `******1234`).
    -   `ADMIN`: Can see full data (audit logged).
-   **Context-Awareness**:
    -   Access to Critical data requires **Step-Up Auth** (MFA) and **Purpose Justification**.
    -   All access to Critical data is logged to the `ProvenanceLedger`.

---

## 3. Data Subject Rights (DSAR) Workflows

The `PrivacyService` orchestrates DSAR fulfillment across the distributed architecture.

### 3.1 Supported Rights

1.  **Right of Access**: "Show me all data you have on me."
2.  **Right to Rectification**: "Correct my phone number."
3.  **Right to Erasure (RTBF)**: "Delete all my personal data."
4.  **Right to Portability**: "Give me a JSON dump of my data."
5.  **Right to Restriction**: "Stop processing my data for analytics."

### 3.2 Workflow: Right to Erasure (Deletion)

1.  **Submission**: User submits request via Privacy Portal (`PrivacyService.submitRequest`).
2.  **Verification**: System verifies identity (Email/SMS code).
3.  **Orchestration**: `PrivacyService` publishes `DELETE_PII` event.
    -   **PostgreSQL**: Deletes user rows, replaces PII with `[DELETED]`.
    -   **Neo4j**: Deletes User nodes or anonymizes properties.
    -   **Logs/Backups**: Keys added to "Crypto-Shredding" list (deletion upon rotation).
4.  **Confirmation**: `PrivacyEvidence` is generated and signed in `ProvenanceLedger`.
5.  **Notification**: User is notified of completion.

### 3.3 Workflow: Right of Access (Export)

1.  **Submission**: User requests data export.
2.  **Gathering**: `PrivacyService` queries all subsystems (SQL, Graph, Logs).
3.  **Packaging**: Data is aggregated into a standard JSON/CSV format.
4.  **Delivery**: Secure download link generated (expires in 24h).
5.  **Audit**: Export generation is logged in `ProvenanceLedger`.

---

## 4. Evidence & Audit

Every privacy-impacting action is immutable.

-   **Provenance Ledger**: Stores a hash-linked chain of all DSAR requests and actions.
-   **Audit Logs**: Record *who* accessed *what* PII and *why* (Purpose).
-   **Regulator View**: We can generate a `PrivacyEvidence` report proving we complied with a request within the SLA (e.g., 30 days).
