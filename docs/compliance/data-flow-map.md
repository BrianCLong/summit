# Data Flow Map - Summit/IntelGraph Platform

> **Version**: 1.0.0 **Last Updated**: 2025-12-07 **Classification**: Internal Use **Purpose**:
> Regulatory compliance analysis and DPIA support

## Executive Summary

This document provides a simplified data flow map for the Summit/IntelGraph platform, identifying
where personal data, behavioral data, and AI-processed data enters, is stored, is processed, and
exits the system. This map supports regulatory stance analysis under GDPR, CCPA, and EU AI Act
frameworks.

---

## 1. Data Entry Points

### 1.1 User-Facing Interfaces

| Entry Point                               | Data Types                                     | Collection Method         | Lawful Basis (GDPR)           |
| ----------------------------------------- | ---------------------------------------------- | ------------------------- | ----------------------------- |
| **Web Application** (`client/`)           | User credentials, session data, preferences    | Direct input, cookies     | Contract, Consent             |
| **API Gateway** (`services/api-gateway/`) | API keys, request metadata, query parameters   | HTTP headers, body        | Contract, Legitimate Interest |
| **GraphQL API** (`services/api/`)         | Entity data, relationship data, search queries | GraphQL mutations/queries | Contract                      |
| **Mobile Apps** (`apps/mobile/`)          | Device ID, location, push tokens               | SDK collection            | Consent                       |

### 1.2 System Integrations

| Entry Point                                               | Data Types                         | Source           | Processing Purpose    |
| --------------------------------------------------------- | ---------------------------------- | ---------------- | --------------------- |
| **Ingest Connectors** (`integrations/connectors/`)        | External intelligence feeds, OSINT | Third-party APIs | Intelligence analysis |
| **Data Import** (`services/bulk-import/`)                 | Bulk datasets, CSV/JSON imports    | File upload      | Investigation support |
| **Streaming Ingestion** (Kafka/Redpanda)                  | Real-time events, telemetry        | Event streams    | Continuous monitoring |
| **GRC Connector** (`integrations/connectors/compliance/`) | Compliance data, audit records     | GRC platforms    | Compliance reporting  |

### 1.3 AI/ML Data Collection

| Entry Point                                           | Data Types                            | Purpose           | AI Act Classification    |
| ----------------------------------------------------- | ------------------------------------- | ----------------- | ------------------------ |
| **Copilot Service** (`services/copilot/`)             | User queries, context, feedback       | AI assistance     | Transparency required    |
| **Entity Resolution** (`services/entity-resolution/`) | Identity attributes, matching signals | Identity linking  | High-risk (if biometric) |
| **Threat Intel** (`services/threat-intel/`)           | Behavioral patterns, risk indicators  | Threat assessment | Risk-based               |

---

## 2. Data Storage Locations

### 2.1 Primary Data Stores

| Storage                 | Technology    | Data Categories                          | Encryption                      | Retention                     |
| ----------------------- | ------------- | ---------------------------------------- | ------------------------------- | ----------------------------- |
| **Graph Database**      | Neo4j         | Entities, relationships, properties      | At-rest (AES-256)               | Configurable per tenant       |
| **Relational Database** | PostgreSQL    | User accounts, case metadata, audit logs | At-rest (AES-256)               | 7 years (audit), configurable |
| **Cache Layer**         | Redis         | Session data, query cache, rate limits   | In-memory, optional persistence | TTL-based                     |
| **Object Storage**      | S3/MinIO      | Documents, exports, backups              | At-rest (SSE)                   | Policy-based                  |
| **Search Index**        | Elasticsearch | Searchable content, logs                 | At-rest                         | 90 days (logs), configurable  |

### 2.2 Transient/Processing Storage

| Storage            | Technology     | Data Categories                    | Retention             |
| ------------------ | -------------- | ---------------------------------- | --------------------- |
| **Message Queue**  | Kafka/Redpanda | Events, processing jobs            | 7 days                |
| **Job Queue**      | Redis/BullMQ   | Background tasks                   | Until processed       |
| **ML Model Store** | MLflow/Custom  | Model artifacts, training metadata | Versioned, indefinite |

### 2.3 Compliance-Specific Storage

| Storage                                         | Purpose               | Data Categories        | Special Handling             |
| ----------------------------------------------- | --------------------- | ---------------------- | ---------------------------- |
| **Audit Ledger** (`services/audit_svc/`)        | Immutable audit trail | All access events      | Append-only, tamper-evident  |
| **Provenance Ledger** (`packages/prov-ledger/`) | Data lineage          | Processing history     | Cryptographically signed     |
| **DSAR Queue** (`services/compliance/`)         | Rights requests       | Subject identifiers    | Encrypted, access-controlled |
| **RTBF Tombstones**                             | Deletion records      | Deletion confirmations | Permanent retention          |

---

## 3. Data Processing Services

### 3.1 Core Processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA PROCESSING FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Ingest  │───▶│ Validate │───▶│ Enrich   │───▶│  Store   │              │
│  │  Layer   │    │ & Clean  │    │ & Link   │    │  Layer   │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │                               │                │                    │
│       │                               ▼                ▼                    │
│       │                        ┌──────────┐    ┌──────────┐                │
│       │                        │ Analytics│    │  Graph   │                │
│       │                        │  Engine  │    │  Engine  │                │
│       │                        └──────────┘    └──────────┘                │
│       │                               │                │                    │
│       ▼                               ▼                ▼                    │
│  ┌──────────┐                  ┌──────────┐    ┌──────────┐                │
│  │  Audit   │◀─────────────────│   AI     │───▶│  Query   │                │
│  │  Trail   │                  │ Services │    │  Layer   │                │
│  └──────────┘                  └──────────┘    └──────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Service-by-Service Processing Map

| Service                                               | Input Data                 | Processing Operations                  | Output Data               | Regulatory Flags               |
| ----------------------------------------------------- | -------------------------- | -------------------------------------- | ------------------------- | ------------------------------ |
| **API Server** (`server/`)                            | User requests, auth tokens | Authentication, authorization, routing | Responses, session data   | Access logging                 |
| **Graph API** (`services/graph-api/`)                 | Entity queries, mutations  | Graph traversal, relationship analysis | Entity data, paths        | Profiling potential            |
| **Analytics Engine** (`apps/analytics-engine/`)       | Raw events, metrics        | Aggregation, trend analysis            | Reports, dashboards       | Large-scale processing         |
| **Copilot** (`services/copilot/`)                     | User queries, context      | LLM inference, RAG                     | AI responses, suggestions | AI Act transparency            |
| **Entity Resolution** (`services/entity-resolution/`) | Identity attributes        | Matching, deduplication, linking       | Resolved entities         | Profiling, potential biometric |
| **Threat Intel** (`services/threat-intel/`)           | Indicators, behaviors      | Scoring, classification                | Risk assessments          | Automated decision-making      |
| **Compliance** (`services/compliance/`)               | DSAR/RTBF requests         | Data location, extraction, deletion    | Exports, confirmations    | Rights fulfillment             |

### 3.3 AI/ML Processing Pipeline

| Stage          | Service                                         | Data Processed          | AI Act Considerations        |
| -------------- | ----------------------------------------------- | ----------------------- | ---------------------------- |
| **Training**   | `services/ai-service-platform/`                 | Historical data, labels | Data governance required     |
| **Inference**  | `services/copilot/`, `services/ai-sandbox/`     | User queries, context   | Transparency, logging        |
| **Evaluation** | `services/evals/`                               | Test datasets, metrics  | Bias monitoring              |
| **Scoring**    | `services/threat-intel/`, `services/analytics/` | Behavioral data         | Human oversight if high-risk |

---

## 4. Data Exit Points

### 4.1 User-Facing Exports

| Exit Point                                     | Data Types            | Format        | Controls                          |
| ---------------------------------------------- | --------------------- | ------------- | --------------------------------- |
| **DSAR Export** (`services/compliance/`)       | Personal data package | JSON, PDF     | Identity verification, encryption |
| **Report Export** (`client/`, `services/api/`) | Investigation reports | PDF, DOCX     | Access control, watermarking      |
| **Data Export** (`services/bulk-export/`)      | Bulk datasets         | CSV, JSON     | Authorization, audit logging      |
| **API Responses**                              | Query results         | JSON, GraphQL | Rate limiting, field-level access |

### 4.2 System Integrations (Outbound)

| Exit Point            | Destination          | Data Types          | Transfer Mechanism         |
| --------------------- | -------------------- | ------------------- | -------------------------- |
| **Webhook Delivery**  | External systems     | Event notifications | HTTPS, signed payloads     |
| **SIEM Integration**  | Security tools       | Audit logs, alerts  | Syslog, API push           |
| **GRC Export**        | Compliance platforms | Compliance evidence | Scheduled sync             |
| **Federated Queries** | Partner systems      | Cross-org data      | mTLS, federation protocols |

### 4.3 Third-Party Services

| Exit Point               | Third Party             | Data Types      | Legal Basis         | Transfer Safeguards    |
| ------------------------ | ----------------------- | --------------- | ------------------- | ---------------------- |
| **LLM Providers**        | OpenAI, Anthropic, etc. | Query context   | Contract            | DPA, SCCs              |
| **Cloud Infrastructure** | AWS, GCP, Azure         | All hosted data | Contract            | DPA, adequacy/SCCs     |
| **Observability**        | Datadog, Grafana Cloud  | Telemetry, logs | Legitimate Interest | DPA, data minimization |
| **Email/Notifications**  | SendGrid, Twilio        | Contact data    | Contract            | DPA                    |

---

## 5. Data Subject Rights Mapping

### 5.1 GDPR Rights Implementation

| Right                             | Implementing Service                         | Data Locations       | SLA        |
| --------------------------------- | -------------------------------------------- | -------------------- | ---------- |
| **Access (Art. 15)**              | `services/compliance/dsar.ts`                | All stores           | 30 days    |
| **Rectification (Art. 16)**       | `services/api/`                              | Neo4j, PostgreSQL    | 30 days    |
| **Erasure (Art. 17)**             | `services/compliance/workers/rtbf_worker.ts` | All stores + backups | 30 days    |
| **Restriction (Art. 18)**         | `services/compliance/`                       | Processing flags     | 30 days    |
| **Portability (Art. 20)**         | `services/compliance/dsar.ts`                | Neo4j, PostgreSQL    | 30 days    |
| **Object (Art. 21)**              | `services/api/`, consent management          | Preference store     | Immediate  |
| **Automated Decisions (Art. 22)** | `services/copilot/`, `services/analytics/`   | Decision logs        | On request |

### 5.2 CCPA Rights Implementation

| Right                            | Implementing Service                         | Response Time |
| -------------------------------- | -------------------------------------------- | ------------- |
| **Right to Know**                | `services/compliance/dsar.ts`                | 45 days       |
| **Right to Delete**              | `services/compliance/workers/rtbf_worker.ts` | 45 days       |
| **Right to Opt-Out**             | Consent management, `services/api/`          | Immediate     |
| **Right to Correct**             | `services/api/`                              | 45 days       |
| **Right to Limit Sensitive Use** | `services/compliance/`                       | Immediate     |

---

## 6. High-Risk Processing Areas

### 6.1 Automated Decision-Making

| Feature                    | Service                  | Impact                       | Safeguards             |
| -------------------------- | ------------------------ | ---------------------------- | ---------------------- |
| **Threat Scoring**         | `services/threat-intel/` | Risk classification          | Human review available |
| **Entity Risk Assessment** | `services/analytics/`    | Investigation prioritization | Explainability         |
| **AI Recommendations**     | `services/copilot/`      | Analyst guidance             | Transparency, override |

### 6.2 Profiling Activities

| Activity                        | Data Used                  | Purpose               | DPIA Required |
| ------------------------------- | -------------------------- | --------------------- | ------------- |
| **Behavioral Analysis**         | Interaction logs, patterns | Threat detection      | Yes           |
| **Entity Relationship Mapping** | Association data           | Intelligence analysis | Yes           |
| **User Segmentation**           | Usage patterns             | Product improvement   | Review        |

### 6.3 Special Category Data

| Data Type | Processing Location | Purpose | Legal Basis |
|-----------|--------------------|---------||-------------| | **Biometric (potential)** | Entity
resolution | Identity verification | Explicit consent / Legal obligation | | **Health Data
(potential)** | Case data | Investigation context | Legal obligation | | **Political Opinions
(potential)** | Intelligence data | Threat assessment | Legal obligation / Public interest |

---

## 7. Cross-Border Data Transfers

### 7.1 Transfer Mapping

| Data Flow          | Origin | Destination           | Mechanism                     | TIA Required |
| ------------------ | ------ | --------------------- | ----------------------------- | ------------ |
| **Cloud Hosting**  | EU     | US (AWS/GCP)          | SCCs + supplementary measures | Yes          |
| **LLM API Calls**  | EU     | US (OpenAI/Anthropic) | SCCs + DPA                    | Yes          |
| **Support Access** | EU     | Global                | SCCs + access controls        | Yes          |
| **Federation**     | EU     | Partner jurisdictions | Case-by-case                  | Yes          |

### 7.2 Data Localization Options

| Deployment Mode | Data Residency       | Available Regions   |
| --------------- | -------------------- | ------------------- |
| **SaaS**        | Provider regions     | US, EU, APAC        |
| **Dedicated**   | Customer choice      | Any supported cloud |
| **On-Premises** | Customer data center | Customer controlled |
| **Air-Gapped**  | Isolated network     | Customer controlled |

---

## 8. Data Retention Summary

| Data Category          | Default Retention          | Legal Basis         | Deletion Method      |
| ---------------------- | -------------------------- | ------------------- | -------------------- |
| **User Accounts**      | Account lifetime + 90 days | Contract            | Secure delete        |
| **Investigation Data** | Case closure + 7 years     | Legal obligation    | Scheduled purge      |
| **Audit Logs**         | 7 years                    | Legal obligation    | Archive, then delete |
| **Session Data**       | 24 hours                   | Legitimate interest | TTL expiry           |
| **ML Training Data**   | Model lifetime             | Legitimate interest | Versioned archive    |
| **Backups**            | 90 days rolling            | Business continuity | Rotation             |

---

## 9. Security Controls Summary

| Control                   | Implementation       | Compliance Mapping |
| ------------------------- | -------------------- | ------------------ |
| **Encryption at Rest**    | AES-256-GCM          | GDPR Art. 32       |
| **Encryption in Transit** | TLS 1.3, mTLS        | GDPR Art. 32       |
| **Access Control**        | RBAC + ABAC (OPA)    | GDPR Art. 32       |
| **Audit Logging**         | Immutable ledger     | GDPR Art. 30       |
| **Data Minimization**     | Field-level policies | GDPR Art. 5        |
| **Pseudonymization**      | Available per field  | GDPR Art. 32       |

---

## 10. Regulatory Stance Integration

This data flow map is designed to integrate with the regulatory stance analyzer
(`scripts/compliance/analyze-regulatory-stance.ts`). The analyzer uses this map to:

1. **Identify high-risk processing** based on data types and features
2. **Flag DPIA requirements** when processing matches trigger criteria
3. **Generate compliance checklists** per regulatory framework
4. **Track data flows** for transfer impact assessments

### Usage

```bash
# Analyze stance for GDPR
pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --lens gdpr

# Analyze stance for EU AI Act
pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --lens eu_ai_act

# Generate all reports
pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --all
```

---

## Document Control

| Version | Date       | Author          | Changes          |
| ------- | ---------- | --------------- | ---------------- |
| 1.0.0   | 2025-12-07 | Compliance Team | Initial creation |

---

**DISCLAIMER**: This document is for internal compliance planning purposes only. It does not
constitute legal advice. Consult qualified legal counsel for regulatory compliance matters.
