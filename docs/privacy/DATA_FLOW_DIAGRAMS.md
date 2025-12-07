# Data Flow Diagrams - Privacy & PII Handling

## 1. Data Ingestion & Classification Flow

Data entering CompanyOS is immediately scanned and tagged.

```mermaid
graph TD
    Source[External Source] -->|Raw Data| Ingest[Ingestion Service]
    Ingest -->|Hook| PIIScan[PII Scanner (ingestionHooks.ts)]

    subgraph PII Detection
        PIIScan -->|Recognize| Recognizer[HybridEntityRecognizer]
        Recognizer -->|Entities| Taxonomy[TaxonomyManager]
        Taxonomy -->|Classify| Classifier[SensitivityClassifier]
    end

    Classifier -->|Sensitivity Metadata| TaggedData[Tagged Data Packet]

    TaggedData -->|Routing| Router{Sensitivity Check}

    Router -->|Low/Medium| DB[(Primary DB)]
    Router -->|High/Critical| Encrypt[Encryption Service]
    Encrypt -->|Encrypted| DB

    Router -->|Blocked Content| Quarantine[Quarantine Queue]

    subgraph Metadata Store
        Classifier -.->|Catalog Tags| DataCatalog[Data Catalog]
    end
```

## 2. Secure Access & Redaction Flow

Data access is mediated by the Redaction Middleware.

```mermaid
sequenceDiagram
    participant User
    participant API as GraphQL/REST API
    participant Middleware as RedactionMiddleware
    participant DB as Database
    participant Audit as ProvenanceLedger

    User->>API: Request Data (e.g. User Profile)
    Note over User,API: Context: Role, Purpose, StepUp Token

    API->>DB: Fetch Raw Data
    DB-->>API: Return Data + Metadata

    API->>Middleware: redact(Data, UserContext)

    Middleware->>Middleware: Check Role & Clearance

    alt Insufficient Clearance
        Middleware-->>API: Redact FULL [REDACTED]
    else High Sensitivity
        Middleware->>Middleware: Check Step-Up Auth
        alt Verified
            Middleware->>Audit: Log Access (Purpose)
            Middleware-->>API: Return Clear/Partial Data
        else Unverified
            Middleware-->>API: Throw AccessDenied / Challenge
        end
    else Normal Access
        Middleware-->>API: Return Masked Data (***1234)
    end

    API-->>User: JSON Response
```

## 3. Data Subject Access Request (DSAR) - Deletion Flow

Orchestrating the Right to be Forgotten.

```mermaid
graph LR
    User((User)) -->|1. Submit Request| Portal[Privacy Portal]
    Portal -->|2. Create Request| Svc[PrivacyService]
    Svc -->|3. Log Request| Ledger[Provenance Ledger]

    subgraph Verification
        Svc -->|4. Challenge| Auth[Auth Service]
        Auth -->|5. Verified| Svc
    end

    Svc -->|6. Execute| Orchestrator[DSAR Orchestrator]

    subgraph Systems
        Orchestrator -->|Delete/Anonymize| SQL[PostgreSQL]
        Orchestrator -->|Delete Node| Graph[Neo4j]
        Orchestrator -->|Index Delete| Search[Elasticsearch]
    end

    SQL -->|Confirm| Evidence[Evidence Collector]
    Graph -->|Confirm| Evidence
    Search -->|Confirm| Evidence

    Evidence -->|7. Sign Proof| Ledger
    Svc -->|8. Notify| User
```
