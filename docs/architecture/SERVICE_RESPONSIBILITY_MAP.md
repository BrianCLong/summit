# Service Responsibility Map

This document establishes the official responsibility mapping for the Summit platform services, following the **Platform Decomposition & Service Boundary Hardening** sprint.

## 1. Identity & Access Management (IAM)
**Goal:** Centralize authentication, authorization, and tenant management.
**Responsibilities:**
- User Lifecycle (SignUp, Login, Password Reset)
- Tenant & Workspace Management
- RBAC & Permissions (OPA Integration)
- Session Management (JWT, Refresh Tokens)
- SSO & OIDC Integration

**Services:**
- `AuthService.ts`
- `UserService.ts` (Merged logic from `UserService.ts` and `TenantAdminService.ts`)
- `TenantService.ts`
- `WorkspaceService.ts`
- `OIDCAuthService.ts`
- `ApiKeyService.ts`

**Routes:**
- `/auth/*`
- `/tenants/*`
- `/workspaces/*`
- `/users/*`
- `/scim/*`

## 2. Data Ingestion & Processing
**Goal:** Handle external data entry, normalization, and processing pipelines.
**Responsibilities:**
- File Uploads & Storage
- External Data Connectors (CSV, OSINT)
- Streaming Ingestion
- Document Parsing (PDF, HTML)

**Services:**
- `IngestionService.ts`
- `FileStorageService.ts`
- `CSVImportService.js`
- `StreamingIngestionService.ts`
- `DoclingService.ts`
- `MultimediaDataService.ts`

**Routes:**
- `/ingest/*`
- `/upload/*`
- `/connectors/*`

## 3. Intelligence & Graph
**Goal:** Manage the knowledge graph, entity resolution, and relationships.
**Responsibilities:**
- Graph Database Interactions (Neo4j)
- Entity Resolution & Linking
- Graph Analytics & Algorithms
- RAG (Retrieval Augmented Generation)

**Services:**
- `GraphService.ts`
- `EntityResolutionService.ts`
- `RelationshipService.js`
- `GraphAnalyticsService.ts`
- `GraphRAGService.ts`
- `SearchService.ts` (Elasticsearch)

**Routes:**
- `/graph/*`
- `/entities/*`
- `/search/*`
- `/relationships/*`

## 4. AI & ML
**Goal:** Provide inference, model management, and cognitive capabilities.
**Responsibilities:**
- LLM Inference & Prompt Management
- Embeddings Generation
- Sentiment Analysis & NLP
- Predictive Modeling

**Services:**
- `LLMService.ts`
- `EmbeddingService.ts`
- `SentimentService.js`
- `PredictionService.ts`
- `ContentAnalyzer.ts`

**Routes:**
- `/llm/*`
- `/ai/*`
- `/nlp/*`

## 5. Governance & Compliance
**Goal:** Ensure auditability, policy enforcement, and provenance.
**Responsibilities:**
- Audit Logging (WORM)
- Compliance Monitoring (SOC2, GDPR)
- Provenance Tracking
- Policy Management

**Services:**
- `ComplianceService.ts`
- `AuditService.ts`
- `ProvenanceLedger.ts`
- `PolicyService.ts`
- `DLPService.ts`

**Routes:**
- `/compliance/*`
- `/audit/*`
- `/provenance/*`
- `/policies/*`

## 6. Operations & Orchestration
**Goal:** Manage background jobs, workflows, and system orchestration.
**Responsibilities:**
- Workflow Orchestration (Maestro)
- Background Job Processing (Queues)
- Scheduling
- Alerting & Notification

**Services:**
- `MaestroOrchestrator.ts`
- `QueueService.ts`
- `BatchJobService.ts`
- `NotificationService.js`
- `AlertingService.ts`

**Routes:**
- `/maestro/*`
- `/jobs/*`
- `/alerts/*`

## 7. Infrastructure & Core
**Goal:** Provide shared technical services and utilities.
**Responsibilities:**
- Database Connections & Pooling
- Caching (Redis)
- Secrets Management
- Feature Flags
- Telemetry & Observability

**Services:**
- `DatabaseService.ts`
- `CacheService.ts`
- `SecretsService.ts`
- `FeatureFlagService.ts`
- `TelemetryService.ts`

**Routes:**
- `/health/*`
- `/metrics/*`
