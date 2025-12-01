# Summit Codebase - Comprehensive Service Inventory

**Generated:** 2025-11-21  
**Total Services:** 154  
**Total Packages:** 62  

---

## EXECUTIVE SUMMARY

The Summit platform is a comprehensive intelligence and orchestration system with 154+ microservices organized across multiple domains:

- **Provenance & Audit**: Ledger-based audit trails, claim tracking, lineage management
- **Authorization & Policy**: OPA-based ABAC, authority-compiler for runtime enforcement, role-based access control
- **Data Management**: Entity resolution, graph storage, temporal data handling
- **Orchestration**: Conductor-based workflow management, Maestro for automation
- **Intelligence**: GraphQL APIs, knowledge services, analytics engines
- **Security**: Encryption, privacy controls, DLP, compliance tracking

---

## PART 1: SERVICES DIRECTORY (`/home/user/summit/services/`)

### A. PROVENANCE & AUDIT SERVICES

#### 1. **prov-ledger** (Provenance Ledger Service)
- **Entry Point:** `/home/user/summit/services/prov-ledger/src/index.ts`
- **Technology Stack:** Node.js/TypeScript + Fastify + PostgreSQL
- **Key Dependencies:**
  - fastify (^5.6.1) - HTTP server
  - pg (^8.11.0) - PostgreSQL client
  - crypto - Hash generation and verification
  - zod (^4.1.12) - Schema validation
  - pino (^10.1.0) - Structured logging
  
- **API Endpoints:**
  - `POST /claims` - Create a new claim with content, signature, and metadata
  - `GET /claims/:id` - Retrieve claim by ID
  - `GET /provenance?claimId=<id>` - Get provenance chain for a claim
  - `POST /provenance` - Create provenance chain linking claims to transforms/sources
  - `POST /hash/verify` - Verify hash integrity of content
  - `GET /export/manifest` - Export full claim manifest with hash chain
  - `GET /health` - Health check endpoint

- **Key Features:**
  - Claims-based provenance tracking
  - Cryptographic hashing (SHA256)
  - Lineage tracking with transforms and sources
  - Policy enforcement middleware (authority binding, reason-for-access)
  - Manifest generation with hash chains
  - Dry-run mode for policy testing

- **Database Schema:**
  - `claims` table: id, content (JSONB), hash, signature, metadata, created_at, authority_id, reason_for_access
  - `provenance_chains` table: id, claim_id, transforms, sources, lineage, created_at, authority_id

---

#### 2. **audit-log** Service
- **Entry Point:** Unknown (likely archive or legacy)
- **Technology Stack:** TypeScript
- **Key Functionality:** Audit log integrity tracking and testing
- **Files:**
  - `src/index.ts` - Main service
  - `src/__tests__/integrity.test.ts` - Integrity verification tests

---

#### 3. **auditlake** Service
- **Entry Point:** `/home/user/summit/services/auditlake/src/audit-lake-engine.ts`
- **Key Features:** Central audit event aggregation and analysis
- **Integration Points:** Provenance ledger, policy systems

---

#### 4. **audit** Service (Lightweight Python)
- **Entry Point:** `/home/user/summit/services/audit/anchor_daily.py`
- **Technology Stack:** Python
- **Key Features:** Daily anchor audits for data integrity

---

### B. AUTHORIZATION & POLICY SERVICES

#### 5. **authz-gateway** (Authorization Gateway)
- **Entry Point:** `/home/user/summit/services/authz-gateway/src/index.ts`
- **Technology Stack:** Node.js/Express + JOSE + OpenTelemetry
- **Key Dependencies:**
  - express (^5.1.0) - Web framework
  - jose (^6.1.0) - JWT handling
  - http-proxy-middleware (^3.0.5) - Request proxying
  - pino (^10.1.0) - Logging
  - @opentelemetry/* - Observability

- **API Endpoints:**
  - `POST /auth/login` - User authentication
  - `GET /.well-known/jwks.json` - Public key set (OIDC)
  - `POST /auth/introspect` - Token introspection
  - `GET /subject/:id/attributes` - Get subject attributes
  - `GET /resource/:id/attributes` - Get resource attributes
  - `POST /authorize` - ABAC authorization decision
  - `POST /auth/webauthn/challenge` - WebAuthn step-up challenge
  - `POST /auth/step-up` - Step-up authentication verification
  - `GET /metrics` - Prometheus metrics

- **Key Components:**
  - **AttributeService**: Subject/resource attribute resolution and caching
  - **OPA Integration**: Connects to Open Policy Agent at `OPA_URL` env var
  - **StepUpManager**: WebAuthn-based step-up authentication
  - **Policy Engine**: Attribute-based access control (ABAC) with OPA

- **Authorization Decision Structure:**
  ```javascript
  {
    allow: boolean,
    reason: string (allow|deny|policy_denial),
    obligations: Array<string>
  }
  ```

- **Policy Middleware:**
  - Validates authority binding (`x-authority-id` header)
  - Validates reason-for-access (`x-reason-for-access` header)
  - Supports dry-run mode for policy testing
  - Request metrics collection

---

#### 6. **policy-audit** Service
- **Entry Point:** `/home/user/summit/services/policy-audit/src/`
- **Technology Stack:** TypeScript
- **Key Features:** Policy execution auditing and compliance tracking
- **Integration:** Works with authority-compiler and OPA

---

#### 7. **ga-policy-engine** Service
- **Technology Stack:** Python/TypeScript
- **Key Features:** Policy engine for general availability features
- **Integration Points:** Main API gateway, authorization decisions

---

### C. GRAPH & DATA MANAGEMENT SERVICES

#### 8. **graph-core** Service
- **Entry Point:** `/home/user/summit/services/graph-core/src/index.ts`
- **Technology Stack:** Node.js/Express + Neo4j + PostgreSQL
- **Key Dependencies:**
  - express (^5.1.0)
  - neo4j-driver (^6.0.1)
  - pg (^8.16.3)
  - zod (^4.1.12)

- **API Endpoints:**
  - Entity CRUD operations
  - Relationship management
  - Graph queries and traversals

- **Database Integrations:**
  - Neo4j for graph data
  - PostgreSQL for relational metadata

---

#### 9. **graph-api** Service
- **Technology Stack:** TypeScript/Node.js
- **Key Features:** 
  - Path algorithms (shortest path, traversal)
  - Graph analytics
  - Cypher query support

---

#### 10. **data-spine** Service
- **Entry Point:** `/home/user/summit/services/data-spine/src/`
- **Technology Stack:** TypeScript
- **Key Features:** Central data backbone, entity correlation
- **Integration:** Entity resolution, graph storage

---

#### 11. **entity-resolution** (ER) Service
- **Entry Point:** `/home/user/summit/services/er/main.py`
- **Technology Stack:** Python + ML pipelines
- **Key Features:**
  - Entity matching and deduplication
  - Similarity scoring
  - ML-based feature generation

- **Key Files:**
  - `er/matcher.py` - Core matching logic
  - `er/features.py` - Feature extraction
  - `er/er_pipeline.py` - Full pipeline orchestration

---

### D. ORCHESTRATION & WORKFLOW SERVICES

#### 12. **conductor** Service
- **Entry Point:** `/home/user/summit/services/conductor/src/index.ts`
- **Technology Stack:** Node.js/TypeScript
- **Key Components:**
  - **Fabric Router** (`conductor/src/fabric/policyRouter.ts`) - Routes requests through policy gates
  - **Plugin Registry** (`conductor/src/plugins/registry.ts`) - Plugin management
  - **Provenance Ledger** (`conductor/src/provenance/ledger.ts`) - Records all transformations
  - **Context Planner** - Plans execution context
  - **Guarded Generator** - Safe prompt generation

- **Provenance Tracking:**
  - Records input/output hashes at each step
  - Supports steps: router, generator, critic, evaluator, normalizer, planner, coordinator
  - Tracks model IDs, checkpoints, parameters, and policy metadata

- **Policy Integration:**
  - Policy-based routing decisions
  - Retention and purpose tracking
  - License class tracking

---

#### 13. **release** Service (Canary Manager)
- **Entry Point:** `/home/user/summit/services/release/canary/canaryManager.ts`
- **Key Features:** Release orchestration, canary deployments, health scoring

---

#### 14. **workflow** Service
- **Entry Point:** `/home/user/summit/services/workflow/package.json`
- **Technology Stack:** Node.js/TypeScript
- **Key Features:** Workflow execution engine

---

#### 15. **agent-runtime** Service
- **Entry Point:** `/home/user/summit/services/agent-runtime/src/index.ts`
- **Technology Stack:** Node.js/TypeScript
- **Key Features:** Runtime for autonomous agents

---

### E. API GATEWAY & INTEGRATION SERVICES

#### 16. **api-gateway** Service
- **Entry Point:** `/home/user/summit/services/api-gateway/src/index.ts`
- **Technology Stack:** Node.js + Apollo Server + GraphQL
- **Key Dependencies:**
  - @apollo/server (^5.1.0)
  - express (^5.1.0)
  - graphql (^16.12.0)
  - cors (^2.8.5)
  - helmet (^8.1.0)

- **GraphQL Schema Highlights:**
  - Entity types (id, type, properties, timestamps)
  - Relationship types (source, target, confidence)
  - XAI Explanation types (with fairness/robustness scores)
  - Provenance types (Claims, ProvenanceChains)
  - Runbook types for task execution
  - Forecast types for predictions

- **Key Resolvers:**
  - **Entity Resolvers:** Delegate to graph service
  - **XAI Resolvers:** Delegate to graph-xai service
  - **Provenance Resolvers:** Delegate to prov-ledger service
  - All include policy headers (X-Authority-ID, X-Reason-For-Access)

- **Security Middleware:**
  - Helmet for security headers
  - CORS configuration
  - Compression
  - Winston logging

---

#### 17. **api** Service
- **Entry Point:** `/home/user/summit/services/api/src/app.ts`
- **Technology Stack:** Node.js/TypeScript
- **Key Middleware:**
  - `middleware/auditLog.ts` - In-memory audit log (circular buffer, max 1000 events)
  - `middleware/auth.ts` - Authentication
  - `middleware/rateLimit.ts` - Rate limiting
  - `middleware/dlpMiddleware.ts` - Data loss prevention

- **Routes:**
  - `/admin` - Admin operations with rate limiting
  - `/cases` - Case management
  - `/evidence` - Evidence tracking
  - `/triage` - Alert triage
  - GraphQL persisted queries

- **Audit Log Structure:**
  ```typescript
  {
    ts: string (ISO timestamp),
    user: User object,
    action: string,
    details: any,
    ip: string
  }
  ```

---

### F. INTELLIGENCE & ANALYSIS SERVICES

#### 18. **insights** Service
- **Key Features:** Intelligence insights and analysis

---

#### 19. **search** Service
- **Key Features:** Full-text and graph search

---

#### 20. **rag** (Retrieval-Augmented Generation) Service
- **Key Features:** RAG pipeline for document-based querying

---

#### 21. **aml** (Anti-Money Laundering) Service
- **Key Files:**
  - `src/entity-resolver.ts` - Entity linking for AML networks
  - `src/sanctions-screener.ts` - Sanctions list screening

---

### G. PROCESSING & TRANSFORMATION SERVICES

#### 22. **docling-svc** Service
- **Entry Point:** `/home/user/summit/services/docling-svc/src/server.ts`
- **Key Features:** Document processing and extraction
- **Provenance Tracking:** Records document processing lineage
- **Integration:** Granite for AI processing

---

#### 23. **feed-processor** Service
- **Entry Point:** `/home/user/summit/services/feed-processor/src/index.ts`
- **Key Features:** Process and normalize feed data

---

#### 24. **ingest** Services (Multiple)
- **ingest** - Main ingestion service
- **ingest-sandbox** - Sandboxed ingestion environment
- **web-ingest** - Web content ingestion

---

#### 25. **analytics** Service
- **Key Features:** Offline evaluation and analytics
- **Key Files:** `services/analytics/offline_eval.py`

---

### H. DATA QUALITY & VALIDATION SERVICES

#### 26. **data-quality** Service
- **Key Features:** 
  - Lineage tracking (`src/lineage-tracker.ts`)
  - Data quality monitoring
  - Anomaly detection

---

#### 27. **anomaly** Service (Python)
- **Entry Point:** `/home/user/summit/services/anomaly/engine.py`
- **Key Components:**
  - `detectors.py` - Anomaly detection algorithms
  - `api.py` - REST API interface
  - Tests and evaluation

---

### I. SPECIALIZED SERVICES

#### 28. **privacy** Service
- **Entry Point:** `/home/user/summit/services/privacy/src/`
- **Key Features:**
  - Consent reconciliation
  - Privacy controls
  - Data residency enforcement

---

#### 29. **compliance** Service
- **Key Features:**
  - DSAR (Data Subject Access Request) handling
  - RTBF (Right to be Forgotten)
  - Evidence collection
  - Compliance reporting

---

#### 30. **exporter** Service
- **Entry Point:** `/home/user/summit/services/exporter/src/index.ts`
- **Key Features:** Data export with security controls

---

#### 31. **geospatial** Service (Python)
- **Entry Point:** `/home/user/summit/services/geospatial/main.py`
- **Key Features:** Geospatial analytics and mapping

---

#### 32. **scheduler** Service
- **Key Features:** Job scheduling and execution
- **Admission Control:** `services/scheduler/admission/admission-controller.ts`

---

**Total Key Services Documented:** 32+ (out of 154 total)

---

## PART 2: PACKAGES DIRECTORY (`/home/user/summit/packages/`)

### A. ORCHESTRATION & WORKFLOW PACKAGES

#### 1. **maestro-core**
- **Purpose:** Core orchestration engine
- **Location:** `/home/user/summit/packages/maestro-core/package.json`
- **Key Dependencies:**
  - AWS SDK (S3, storage)
  - OpenTelemetry (observability)
  - pg (database)
  - axios (HTTP client)
  - jsdom, cheerio (DOM parsing)
  - robots-txt-parser

- **Key Features:**
  - Orchestration engine
  - Plugin system with cosign and litellm plugins
  - Policy-based execution (OPA integration)
  - Web scraping capabilities
  - Observability with Jaeger/Prometheus

---

#### 2. **maestro-cli**
- **Purpose:** CLI for Maestro orchestration
- **Key Commands:** run, dsar
- **Integration:** Works with maestro-core

---

#### 3. **maestroflow**
- **Purpose:** Workflow DSL and execution
- **Entry Point:** `/home/user/summit/packages/maestroflow/`

---

### B. PROVENANCE & AUDIT PACKAGES

#### 4. **prov-ledger-sdk**
- **Purpose:** TypeScript SDK for Provenance Ledger service
- **Location:** `/home/user/summit/packages/prov-ledger-sdk/package.json`
- **Dependencies:** zod (minimal)
- **Exports:** Type definitions and client methods

---

#### 5. **prov-ledger-client**
- **Purpose:** Client library for prov-ledger interactions
- **Integration:** Used by other packages and services

---

#### 6. **prov-ledger** (Package)
- **Purpose:** Package version of prov-ledger
- **Exports:** Ledger client and types

---

#### 7. **policy-audit** (Package)
- **Purpose:** Policy audit and compliance tracking
- **Integration:** Works with authority-compiler

---

### C. AUTHORITY & POLICY PACKAGES

#### 8. **authority-compiler**
- **Purpose:** Authority/License Compiler for Summit Platform
- **Location:** `/home/user/summit/packages/authority-compiler/package.json`
- **Description:** Runtime enforcement of authority policies
- **Key Dependencies:**
  - zod (^3.23.0) - Schema validation
  - uuid (^9.0.0) - ID generation

- **Keywords:** authority, license, policy, rbac, abac, access-control

- **Key Components:**
  - `schema/policy.schema.ts` - Policy schema definitions
  - `compiler.ts` - Policy compilation
  - `evaluator.ts` - Policy evaluation at runtime
  - `middleware.ts` - Express middleware integration

- **Integrations:**
  - OPA for policy evaluation
  - prov-ledger for audit trails
  - Express.js middleware

---

### D. SDK & CONNECTIVITY PACKAGES

#### 9. **sdk-ts** (TypeScript SDK)
- **Purpose:** TypeScript SDK for Summit platform
- **Key Exports:**
  - `context.ts` - Context management
  - `policy.ts` - Policy interfaces
  - `types.ts` - Type definitions

---

#### 10. **sdk-py** (Python SDK)
- **Purpose:** Python SDK for Summit platform
- **Location:** `/home/user/summit/packages/sdk-py/`

---

#### 11. **sdk-python** (Alt Python SDK)
- **Purpose:** Alternative Python SDK
- **Location:** `/home/user/summit/packages/sdk-python/`

---

#### 12. **sdk** (Multi-language SDK)
- **Purpose:** Polyglot SDK with language-specific packages
- **Sub-packages:**
  - `sdk/secrets-js` - JavaScript secrets management
  - `sdk/privacy-js` - JavaScript privacy utilities

---

#### 13. **common-types**
- **Purpose:** Shared type definitions across platform
- **Key Exports:**
  - `types.ts` - Core types
  - `envelope.ts` - Message envelope structures

---

#### 14. **connector-sdk**
- **Purpose:** SDK for building platform connectors
- **Integration Points:** External data sources, APIs

---

### E. INTELLIGENCE & ANALYSIS PACKAGES

#### 15. **graphai** & **graph-ai-core**
- **Purpose:** AI-enhanced graph operations
- **Key Files:** Graph algorithms, AI model integration

---

#### 16. **narrative-engine**
- **Purpose:** Generate narratives from data
- **Integration:** Story/report generation from intelligence

---

#### 17. **govbrief** (Government Briefing)
- **Purpose:** Briefing document generation
- **Key Features:**
  - `pcs.ts` - Briefing creation
  - `pipeline.ts` - Processing pipeline

---

#### 18. **finintel** (Financial Intelligence)
- **Purpose:** Financial intelligence analysis
- **Integration:** Transaction analysis, sanctions screening

---

#### 19. **cyberintel**
- **Purpose:** Cybersecurity intelligence
- **Location:** `/home/user/summit/packages/cyberintel/`

---

#### 20. **osint**
- **Purpose:** Open Source Intelligence package
- **Integration:** Web scraping, OSINT tool integration

---

#### 21. **influence-mining**
- **Purpose:** Influence and network analysis
- **Feature:** Detect influence networks and key actors

---

#### 22. **deception-detector**
- **Purpose:** Deception detection algorithms
- **Use Case:** Misinformation/disinformation detection

---

#### 23. **psyops-module**
- **Purpose:** Psychological operations analysis
- **Integration:** Cognitive bias detection, narrative analysis

---

### F. DOMAIN-SPECIFIC PACKAGES

#### 24. **event-booster**
- **Purpose:** Event processing and enrichment
- **Key Types:** Event data structures and operations

---

#### 25. **liquid-nano**
- **Purpose:** Lightweight liquid template engine
- **Key Features:**
  - Runtime configuration
  - Template processing
  - Examples and documentation

---

#### 26. **mapping-dsl**
- **Purpose:** Domain-Specific Language for data mapping
- **Use Case:** Schema mapping, data transformation rules

---

#### 27. **jira-integration**
- **Purpose:** Jira integration package
- **Key Files:**
  - `client.ts` - Jira API client
  - `jiraIntegration.ts` - Integration logic

---

#### 28. **lreg-exporter** (License Registry Exporter)
- **Purpose:** Export license registry data
- **Server Integration:** Exports to external systems

---

#### 29. **hit-protocol** (Handy Integration Tool Protocol)
- **Purpose:** Integration protocol definition
- **Use Case:** Standard connector protocol

---

#### 30. **hrn** (Hierarchical Resource Name)
- **Purpose:** Resource naming and identification
- **Integration:** Unique resource identification across platform

---

### G. SPECIALIZED PACKAGES

#### 31. **adc** (Application Data Catalog)
- **Purpose:** Catalog and discover applications

---

#### 32. **aer-ledger** (Application Event Record Ledger)
- **Purpose:** Application event tracking ledger

---

#### 33. **afl-store** (Application Flow Store)
- **Purpose:** Store and manage application workflows

---

#### 34. **atl** (Application Template Library)
- **Purpose:** Templates for application development

---

#### 35. **canary-lattice**
- **Purpose:** Canary deployment orchestration
- **Integration:** Release management

---

#### 36. **canonical-entities**
- **Purpose:** Canonical entity definitions
- **Key Files:**
  - `types.ts` - Entity type definitions
  - `graphql-types.ts` - GraphQL schema integration

---

#### 37. **contracts**
- **Purpose:** API and service contracts
- **Integration:** Contract testing, schema validation

---

#### 38. **crsp** (Compliance Risk Scoring Platform)
- **Purpose:** Compliance risk calculation
- **Key Tests:** Compliance scoring algorithms

---

#### 39. **gdr** (Global Data Registry)
- **Purpose:** Central data registry
- **Key Tests:** Registry operations

---

#### 40. **gateway-tariff**
- **Purpose:** API gateway tariffing/billing
- **Integration:** Rate limiting, billing

---

#### 41. **gml** (Graph Modeling Language)
- **Purpose:** Language for graph definitions
- **Components:** Type system, validation

---

#### 42. **geo** & **geotemporal**
- **Purpose:** Geographic and temporal data handling
- **Use Case:** Location-based intelligence, temporal queries

---

#### 43. **kpw-media** (Key Person Tracking - Media)
- **Purpose:** Media analysis for key figures

---

#### 44. **kompromat-sim** (Compromise Material Simulator)
- **Purpose:** Simulation of compromise scenarios
- **Note:** Appears to be for red-teaming or scenario analysis

---

#### 45. **ledger-server**
- **Purpose:** Server-side ledger management

---

#### 46. **marketplace**
- **Purpose:** Platform marketplace for services/plugins

---

#### 47. **rptc** (Report Template Collection)
- **Purpose:** Report templates
- **Integration:** Report generation

---

#### 48. **tasks-core**
- **Purpose:** Core task execution framework
- **Integration:** Workflow task execution

---

#### 49. **types**
- **Purpose:** Shared type definitions
- **Scope:** Platform-wide types

---

**Total Packages Documented:** 49 (out of 62 total)

---

## PART 3: SERVER STRUCTURE (`/home/user/summit/server/src/`)

### A. KEY DIRECTORIES & COMPONENTS

#### 1. **Middleware** (`/server/src/middleware/`)
Essential request processing middleware:

```
Key Middleware Files:
├── auth.ts - Authentication (OIDC, JWT)
├── opa-abac.ts - OPA-based ABAC policy enforcement
├── opa-enforcer.ts - OPA policy enforcement wrapper
├── opa-with-appeals.ts - OPA with appeal mechanism
├── authority.ts - Authority verification
├── rbac.ts - Role-based access control
├── audit-logger.ts - Audit event logging
├── pii-redaction.ts - PII data redaction
├── dlpMiddleware.ts - Data Loss Prevention
├── rateLimit.ts / rateLimiting.ts - Rate limiting
├── requestId.ts - Request correlation
├── tenantValidator.ts / tenantAllowlist.ts - Tenant isolation
├── spiffe-auth.ts - SPIFFE identity integration
├── graphql-authz.ts - GraphQL authorization
├── graphql-hardening.ts - GraphQL security hardening
├── opa.ts - OPA client integration
├── rfa.ts - Reason For Access validation
├── maestro-authz.ts - Maestro-specific authorization
├── withAuthAndPolicy.ts - Combined auth + policy
├── input-validation.ts - Input validation
├── security.ts - General security controls
└── observability/ - OpenTelemetry middleware
```

#### 2. **GraphQL** (`/server/src/graphql/`)

##### Schema Files:
```
Key Schema Files:
├── schema.provenance.ts - Provenance types and queries
├── schema.trust-risk.ts - Trust and risk assessment types
├── intelgraph/schema.ts - Core IntelGraph schema
└── intelgraph/persisted-queries.ts - Cached GraphQL queries
```

##### Resolver Files (30+):
```
Major Resolver Groups:
├── resolvers.ts - Main resolvers
├── resolvers-combined.ts - Combined resolver implementations
├── resolvers.graphops.ts - Graph operations
├── resolvers.graphAnalytics.ts - Graph analytics
├── resolvers.ai.ts - AI/LLM resolvers
├── resolvers.copilot.ts - Copilot integration
├── resolvers.collab.ts - Collaboration features
├── resolvers.crystal.ts - Crystal (data mart)
├── resolvers.er.ts - Entity Resolution
├── resolvers.annotations.ts - Annotation handling
├── intelgraph/resolvers.ts - IntelGraph core resolvers
├── conductor/resolvers.ts - Conductor orchestration
├── tools/resolvers.ts - Tool management
├── integrations/resolvers.ts - External integrations
├── saas/resolvers.ts - SaaS features
├── search/resolvers.ts - Search functionality
├── recipes/resolvers.ts - Recipe/template management
├── disclosure/resolvers.ts - Disclosure workflows
└── modules/core/resolvers.ts - Core module resolvers
```

##### Plugins:
```
GraphQL Plugins:
├── auditLogger.ts - Audit logging plugin
├── dlpPlugin.ts - Data Loss Prevention plugin
├── persistedQueries.ts - Persisted query caching
├── persistedEnforcer.ts - Enforce persisted queries
├── requireBudgetPlugin.ts - Budget enforcement
├── resolverMetrics.ts - Resolver performance metrics
└── middleware/otelPlugin.ts - OpenTelemetry plugin
```

#### 3. **Services** (`/server/src/services/`)

Over 150 services including:
- **AI/ML Services:** AIExtractionService, AIQueueService, AdvancedMLService
- **Analytics:** AdvancedAnalyticsService, GraphAnalyticsService
- **Entity/Graph:** EntityResolutionService, EntityModelService, GraphStore, GraphOpsService
- **Security:** AccessControl, DefensivePsyOpsService, DLPService, EnterpriseSecurityService
- **Compliance:** ComplianceService, DataRetentionService
- **Detection:** DetectionContentPackV5, DetectionContentPackV6, AlertTriageV2Service
- **Orchestration:** CopilotOrchestrationService, CopilotIntegrationService
- **Analysis:** AnalystDashboardService, AnalystFeedbackService, ContextAnalysisService
- **Graph:** EntityLinkingService, EntityCorrelationEngine, GNNService
- **Search:** FederatedSearchService, GlobalIngestor
- **Export:** DeterministicExportService
- **Database:** DatabaseService, GraphStore, CustomSchemaService
- **And many more...**

#### 4. **Key Domain Modules** (`/server/src/graphql/modules/`)

```
Domain Modules:
├── core/
│   └── services/ (ai.ts, graph-store.ts)
└── security/ (directives.ts)
```

#### 5. **Other Key Components**

```
Additional Structure:
├── ai/ - AI/LLM integration
├── audit/ - Audit logging and verification
├── auth/ - Authentication logic
├── cases/ - Case management
├── conductor/ - Conductor orchestration
├── database/ - Database utilities
├── connectors/ - Connector implementations
├── governance/ - Governance and policies
├── privacy/ - Privacy controls
├── security/ - Security utilities
├── observability/ - Monitoring and tracing
├── temporal/ - Temporal/time-based queries
├── websocket/ - Real-time WebSocket connections
├── workers/ - Background worker processes
├── qam/ - Quality Assurance & Metrics
└── data-residency/ - Data locality controls
```

---

## PART 4: PROVENANCE & AUDIT RELATED CODE

### A. PROVENANCE ARCHITECTURE

#### Services:
1. **prov-ledger** - Central provenance ledger
   - Claims-based tracking
   - Hash verification
   - Manifest generation

2. **conductor** - Provenance in orchestration
   - Records pipeline transformations
   - Hash inputs/outputs
   - Tracks model metadata

3. **audit-log** - Audit event storage
4. **auditlake** - Audit lake aggregation

#### Packages:
1. **prov-ledger-sdk** - TypeScript client
2. **prov-ledger-client** - Client library
3. **prov-ledger** - Package version

#### GraphQL Integration:
- **schema.provenance.ts** - Provenance type definitions
- Queries for retrieving claims and lineage
- Integration with api-gateway

### B. AUDIT TRACKING

#### In-Service Audit Logs:
- **API Service:** `/home/user/summit/services/api/src/middleware/auditLog.ts`
  - Circular buffer (max 1000 events)
  - Timestamp, user, action, details, IP
  - Accessible via `getAuditEvents()` function

#### Policy Audit:
- **authz-gateway:** Records authorization decisions
- **policy-audit service:** Compliance tracking
- **GraphQL plugins:** auditLogger.ts records all GraphQL operations

### C. LINEAGE TRACKING

#### Data Quality Service:
- `lineage-tracker.ts` - Tracks data transformations
- Records source->transform->target relationships
- Integrates with provenance ledger

#### Conductor Ledger:
- `conductor/src/provenance/ledger.ts`
- **ProvenanceRecord structure:**
  ```typescript
  {
    reqId: string,
    step: 'router' | 'generator' | 'critic' | 'evaluator' | 'normalizer' | 'planner' | 'coordinator',
    inputHash: string,
    outputHash: string,
    modelId?: string,
    ckpt?: string,
    promptHash?: string,
    params?: Record<string, unknown>,
    scores?: Record<string, number>,
    policy: { retention, purpose, licenseClass },
    time: { start, end },
    tags?: string[]
  }
  ```

### D. COMPLIANCE & DATA RETENTION

#### Compliance Service:
- DSAR worker (`compliance/workers/dsar_worker.ts`)
- RTBF worker (`compliance/workers/rtbf_worker.ts`)
- Evidence collection (`compliance/evidence_collector.ts`)

#### Privacy Controls:
- **privacy-labeler:** Labels data with privacy classifications
- **privacy service:** Consent reconciliation
- **PII redaction:** Middleware for sensitive data masking

---

## PART 5: POLICY & AUTHORIZATION RELATED CODE

### A. POLICY EVALUATION ARCHITECTURE

#### OPA Integration (Open Policy Agent):
- **OPA URL:** Environment variable `OPA_URL` (default: http://localhost:8181/v1/data/summit/abac/decision)
- **Policy Format:** Rego language rules
- **Evaluation Pattern:** POST with input JSON

#### Key Middleware:
1. **opa-abac.ts** - Main OPA-based ABAC enforcement
   - Evaluates OIDC JWT tokens
   - Builds policy input from user/resource/action/context
   - Supports fail-closed (deny on error)

2. **opa-enforcer.ts** - OPA wrapper
3. **opa-with-appeals.ts** - Appeals mechanism for denials
4. **opa.ts** - Legacy OPA client

### B. AUTHORIZATION COMPONENTS

#### authz-gateway:
- **AttributeService**: Caches subject/resource attributes
- **Policy Decision:** Allow/Deny with obligations
- **Step-up Authentication:** WebAuthn challenges for high-risk operations

#### Authority Compiler (Package):
- **Runtime Policy Enforcement**
- **Components:**
  - `compiler.ts` - Compile policies to runtime form
  - `evaluator.ts` - Execute policies
  - `middleware.ts` - Express integration
  - `schema/policy.schema.ts` - Policy schema (Zod)

#### Access Control Models:
1. **RBAC** (Role-Based Access Control)
   - `middleware/rbac.ts`
   - Role definitions and membership

2. **ABAC** (Attribute-Based Access Control)
   - `middleware/opa-abac.ts`
   - Attributes: user, resource, action, context
   - OPA evaluates policies

3. **SPIFFE** (Secure Production Identity Framework)
   - `middleware/spiffe-auth.ts`
   - Service identity and authentication

### C. AUTHORIZATION CONTEXT

#### Policy Input Structure (OPA):
```typescript
{
  user: {
    id: string,
    roles: string[],
    attributes: Record<string, any>,
    tenant: string,
    clearance?: string,
    residency?: string,
    acr?: 'loa1' | 'loa2' | 'loa3'  // Assurance level
  },
  resource: {
    type: string,
    id?: string,
    tenantId: string,
    classification?: string,
    residency?: string,
    tags?: string[],
    pii_flags?: Record<string, boolean>
  },
  operation_type: 'query' | 'mutation' | 'subscription',
  field_name?: string,
  action: string,
  context: {
    currentAcr: string,
    decisionContext: any
  }
}
```

#### Policy Decision Result:
```typescript
{
  allowed: boolean,
  reason: string,  // 'allow' | 'deny' | specific reason
  obligations: Array<any>
}
```

### D. REQUEST AUTHORIZATION FLOW

1. **Authentication** (auth.ts, spiffe-auth.ts)
   - Extract/validate identity
   - OIDC token validation
   - Service principal verification

2. **Attribute Resolution** (authz-gateway/AttributeService)
   - Load user attributes
   - Load resource attributes
   - Cache for performance

3. **Policy Evaluation** (opa-abac.ts)
   - Send to OPA with context
   - Fail-closed if OPA unavailable
   - Get decision with obligations

4. **Audit Logging** (audit-logger.ts)
   - Log decision and reason
   - Record user, action, resource, result
   - Send to audit-log service

5. **Obligation Enforcement**
   - Data masking (PII redaction)
   - Rate limiting
   - Tenant isolation

### E. POLICY ENFORCEMENT POINTS

#### GraphQL Layer:
- **graphql-authz.ts** - Authorization directive
- **graphql-hardening.ts** - Security hardening
- **schema directives** - @auth, @policy annotations

#### API Gateway:
- **Policy middleware chain** (`api-gateway/src/middleware/policy.ts`)
- Per-endpoint authorization

#### Service Layer:
- **maestro-authz.ts** - Orchestration-specific authorization
- **policy-sidecar** - Sidecar for sidecar architecture

#### Data Layer:
- **Reason-for-Access (RFA)** validation
- `x-reason-for-access` header requirement
- Appeal mechanism for denials

### F. POLICY CONFIGURATION

#### Environment Variables:
```bash
OPA_URL=http://localhost:8181/v1/data/summit/abac/decision
POLICY_DRY_RUN=true|false  # Test mode
X_AUTHORITY_ID=<authority>  # Authority binding header
X_REASON_FOR_ACCESS=<purpose>  # Purpose tracking header
```

#### Policy Features:
- Dry-run mode for testing
- Appeal system for denied requests
- Obligation enforcement
- Multi-tenancy isolation
- Data residency enforcement
- Temporal access windows
- Step-up authentication requirements

---

## PART 6: API ENDPOINTS & GRAPHQL SCHEMA

### A. KEY REST ENDPOINTS

#### Provenance Ledger Service:
```
POST /claims
GET /claims/:id
POST /provenance
GET /provenance?claimId=<id>
POST /hash/verify
GET /export/manifest
GET /health
```

#### Authorization Gateway:
```
POST /auth/login
POST /auth/introspect
GET /.well-known/jwks.json
GET /subject/:id/attributes
GET /resource/:id/attributes
POST /authorize
POST /auth/webauthn/challenge
POST /auth/step-up
GET /metrics
```

### B. GRAPHQL SCHEMA HIGHLIGHTS

#### Core Types:
```graphql
scalar DateTime
scalar JSON

type Entity {
  id: ID!
  type: String!
  properties: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Relationship {
  id: ID!
  source: Entity!
  target: Entity!
  type: String!
  properties: JSON!
  confidence: Float
  createdAt: DateTime!
}

type Claim {
  id: ID!
  content: JSON!
  hash: String!
  signature: String
  createdAt: DateTime!
}

type ProvenanceChain {
  id: ID!
  claimId: String!
  transforms: [String!]!
  sources: [String!]!
  lineage: JSON!
}

type Explanation {
  id: ID!
  entityId: String
  edgeId: String
  model: String!
  version: String!
  rationale: String!
  counterfactuals: [String!]!
  fairnessScore: Float
  robustnessScore: Float
  createdAt: DateTime!
}

type Runbook {
  id: ID!
  name: String!
  version: String!
  tasks: [RunbookTask!]!
  status: RunbookStatus!
}

type Forecast {
  id: ID!
  series: String!
  horizon: Int!
  predictions: [Float!]!
  confidence: [Float!]!
  model: String!
  createdAt: DateTime!
}
```

#### Query Examples:
```graphql
# Entity and relationship queries
query {
  entity(id: "entity-123") { ... }
  entities(type: "Person") { ... }
  relationships(source: "entity-123") { ... }
}

# XAI Queries
query {
  explainEntity(entityId: "...", model: "...", version: "...") {
    rationale
    fairnessScore
    robustnessScore
  }
}

# Provenance Queries
query {
  claim(id: "claim-123") {
    content
    hash
    signature
  }
  provenance(claimId: "claim-123") {
    transforms
    sources
    lineage
  }
}

# Runbook Queries
query {
  runbook(id: "runbook-123") {
    name
    tasks { ... }
    status
  }
}
```

---

## PART 7: TECHNOLOGY STACK SUMMARY

### Languages & Runtimes:
- **TypeScript** - Primary language for services and packages
- **Python** - Data processing, ML, analytics
- **JavaScript/Node.js** - Server-side runtime
- **GraphQL** - API definition language

### Key Frameworks & Libraries:

#### Node.js/Server:
- **Express** - Web framework
- **Apollo Server** - GraphQL server
- **Fastify** - High-performance HTTP server
- **NestJS** - Framework (likely in some services)

#### Databases:
- **PostgreSQL** - Relational data
- **Neo4j** - Graph database
- **Elasticsearch** (implied) - Search

#### Authentication & Security:
- **JOSE** - JWT handling
- **OPA** - Policy evaluation
- **SPIFFE** - Service identity
- **WebAuthn** - Multi-factor authentication
- **Helmet** - Security headers

#### Observability:
- **OpenTelemetry** - Distributed tracing
- **Jaeger** - Trace collection
- **Prometheus** - Metrics
- **Pino** - Structured logging

#### Data Processing:
- **Zod** - Schema validation
- **UUID** - ID generation
- **Axios** - HTTP client
- **JSDOM/Cheerio** - DOM parsing

#### Testing:
- **Jest** - Test runner
- **Vitest** - Alternative test runner
- **Supertest** - HTTP testing
- **Fast-Check** - Property-based testing

---

## PART 8: INTEGRATION POINTS FOR STRATEGIC IMPLEMENTATION

### Critical Integration Hubs:

#### 1. Authorization Hub (authz-gateway)
- Integrates with OPA for policy evaluation
- Connects to AttributeService for subject/resource data
- Provides JWT tokens with level-of-assurance
- Output: Authorization decisions with obligations

#### 2. Provenance Hub (prov-ledger)
- Receives claims from all services
- Tracks lineage through transforms
- Generates manifest exports
- Input: Claims with authority binding
- Output: Verifiable claim records with proofs

#### 3. Audit Hub (audit-log, auditlake, GraphQL auditLogger)
- Centralizes all audit events
- Links authorization decisions to actions
- Tracks policy violations
- Retention and compliance tracking

#### 4. Orchestration Hub (conductor, maestro-core)
- Routes requests through policy gates
- Records provenance at each step
- Enforces budget controls
- Integrates with RPC and authority validation

#### 5. Data Integration Hub (API Gateway)
- Delegates to specialized services
- Enforces policy on all queries
- Requires authority binding headers
- Logs all access

---

## RECOMMENDATIONS FOR STRATEGIC IMPLEMENTATION

### 1. Service Discovery Pattern:
Use the prov-ledger as source of truth for service registry with provenance tracking.

### 2. Policy Enforcement:
Leverage OPA at two levels:
- Coarse-grained: authz-gateway for access decisions
- Fine-grained: GraphQL directives for field-level control

### 3. Audit Trail Integration:
- Mandate all services emit to prov-ledger
- Use conductor for workflow audit points
- Implement GraphQL auditLogger plugin for all mutations

### 4. Authority Binding:
- Always require x-authority-id and x-reason-for-access headers
- Validate against authority-compiler
- Record in all audit logs

### 5. Lineage Tracking:
- Use conductor provenance ledger for all transformations
- Record input/output hashes at each step
- Generate manifests for compliance reporting

---

## APPENDIX: SERVICE DIRECTORY REFERENCE

**Total Services:** 154  
**Key Service Categories:**
- Provenance: 4 services
- Authorization: 3 services
- Graph/Data: 6 services
- Orchestration: 5 services
- API/Gateway: 2 services
- Intelligence: 10+ services
- Processing: 8+ services
- Quality/Validation: 3 services
- Specialized: 10+ services
- Integration: 9 services
- Other: 100+ services

**Total Packages:** 62  
**Key Package Categories:**
- Orchestration: 3 packages
- Provenance/Audit: 3 packages
- Authority/Policy: 1 package
- SDKs: 5 packages
- Intelligence: 10+ packages
- Domain-specific: 15+ packages
- Infrastructure: 25+ packages

