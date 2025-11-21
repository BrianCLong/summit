# Summit Platform - Service & Package Quick Reference

**Last Updated:** 2025-11-21  
**Total Services:** 154 | **Total Packages:** 62

---

## PROVENANCE & AUDIT SERVICES

| Service | Entry Point | Tech Stack | Purpose | API Endpoints |
|---------|------------|-----------|---------|---------------|
| **prov-ledger** | `services/prov-ledger/src/index.ts` | Node.js/Fastify/PG | Central provenance ledger | POST /claims, GET /claims/:id, POST /provenance, GET /provenance, POST /hash/verify, GET /export/manifest |
| **audit-log** | `services/audit-log/src/index.ts` | TypeScript | Audit integrity tracking | (Testing via tests) |
| **auditlake** | `services/auditlake/src/audit-lake-engine.ts` | TypeScript | Audit aggregation engine | Integrated with other services |
| **audit** | `services/audit/anchor_daily.py` | Python | Daily anchor audits | Python API |

---

## AUTHORIZATION & POLICY SERVICES

| Service | Entry Point | Tech Stack | Purpose | Key Components |
|---------|------------|-----------|---------|-----------------|
| **authz-gateway** | `services/authz-gateway/src/index.ts` | Express/JOSE/OpenTelemetry | Authorization gateway | AttributeService, OPA integration, StepUpManager, Policy Engine |
| **policy-audit** | `services/policy-audit/src/` | TypeScript | Policy execution audit | Compliance tracking |
| **ga-policy-engine** | `services/ga-policy-engine/` | Python/TypeScript | GA policy engine | Authorization decisions |

---

## GRAPH & DATA SERVICES

| Service | Entry Point | Tech Stack | Database | Purpose |
|---------|------------|-----------|----------|---------|
| **graph-core** | `services/graph-core/src/index.ts` | Express/Neo4j/PG | Neo4j + PostgreSQL | Graph operations core |
| **graph-api** | `services/graph-api/` | TypeScript/Node.js | Neo4j | Path algorithms, analytics |
| **data-spine** | `services/data-spine/src/` | TypeScript | Neo4j/PG | Central data backbone |
| **entity-resolution** | `services/er/main.py` | Python/ML | PostgreSQL | Entity matching & dedup |

---

## ORCHESTRATION & WORKFLOW SERVICES

| Service | Entry Point | Tech Stack | Purpose | Key Features |
|---------|------------|-----------|---------|---------------|
| **conductor** | `services/conductor/src/index.ts` | Node.js/TypeScript | Workflow orchestration | Policy router, Provenance ledger, Plugin system |
| **release** | `services/release/canary/canaryManager.ts` | TypeScript | Canary deployments | Health scoring |
| **workflow** | `services/workflow/package.json` | Node.js/TypeScript | Workflow engine | Execution runtime |
| **agent-runtime** | `services/agent-runtime/src/index.ts` | Node.js/TypeScript | Autonomous agents | Agent execution |

---

## API GATEWAY & INTEGRATION SERVICES

| Service | Entry Point | Tech Stack | Purpose | Key Features |
|---------|------------|-----------|---------|---------------|
| **api-gateway** | `services/api-gateway/src/index.ts` | Apollo/GraphQL/Express | GraphQL API gateway | Delegation, Entity/Relationship/Provenance types |
| **api** | `services/api/src/app.ts` | Node.js/TypeScript | REST API service | Audit logging, Auth, Rate limiting, DLP |

---

## INTELLIGENCE & ANALYSIS SERVICES

| Service | Entry Point | Tech Stack | Purpose | Use Case |
|---------|------------|-----------|---------|-----------|
| **insights** | `services/insights/` | TypeScript | Intelligence insights | Analysis generation |
| **search** | `services/search/` | TypeScript | Full-text search | Graph search, discovery |
| **rag** | `services/rag/` | TypeScript/Python | RAG pipeline | Document-based querying |
| **aml** | `services/aml/src/entity-resolver.ts` | TypeScript | Anti-money laundering | Sanctions screening, network linking |

---

## PROCESSING & TRANSFORMATION SERVICES

| Service | Entry Point | Tech Stack | Purpose | Features |
|---------|------------|-----------|---------|-----------|
| **docling-svc** | `services/docling-svc/src/server.ts` | Node.js/TypeScript | Document processing | Extraction, OCR, Provenance tracking |
| **feed-processor** | `services/feed-processor/src/index.ts` | Node.js/TypeScript | Feed processing | Normalization, enrichment |
| **ingest** | `services/ingest/` | TypeScript/Python | Main ingestion | Data ingestion pipeline |
| **ingest-sandbox** | `services/ingest-sandbox/main.py` | Python | Sandboxed ingest | Safe ingestion environment |
| **web-ingest** | `services/web-ingest/` | TypeScript | Web content ingest | Web scraping, crawling |

---

## DATA QUALITY & VALIDATION SERVICES

| Service | Entry Point | Tech Stack | Purpose | Key Files |
|---------|------------|-----------|---------|-----------|
| **data-quality** | `services/data-quality/src/` | TypeScript | Data quality monitoring | lineage-tracker.ts |
| **anomaly** | `services/anomaly/engine.py` | Python | Anomaly detection | detectors.py, api.py |

---

## SPECIALIZED SERVICES

| Service | Entry Point | Tech Stack | Purpose | Key Features |
|---------|------------|-----------|---------|---------------|
| **privacy** | `services/privacy/src/` | TypeScript | Privacy controls | Consent reconciliation, residency |
| **compliance** | `services/compliance/` | TypeScript/Python | Compliance tracking | DSAR, RTBF, evidence collection |
| **exporter** | `services/exporter/src/index.ts` | Node.js/TypeScript | Data export | Security-controlled export |
| **geospatial** | `services/geospatial/main.py` | Python | Geospatial analysis | Location-based intelligence |
| **scheduler** | `services/scheduler/` | TypeScript | Job scheduling | Admission control |

---

## ADDITIONAL SERVICES (100+ more)

**Categories:**
- **AI/ML:** AIExtractionService, AIQueueService, AdvancedMLService
- **Analytics:** AdvancedAnalyticsService, GraphAnalyticsService
- **Entity/Graph:** EntityResolutionService, EntityModelService, GraphStore, GraphOpsService
- **Security:** AccessControl, DefensivePsyOpsService, DLPService, EnterpriseSecurityService
- **Compliance:** ComplianceService, DataRetentionService
- **Detection:** DetectionContentPackV5, DetectionContentPackV6, AlertTriageV2Service
- **Orchestration:** CopilotOrchestrationService, CopilotIntegrationService
- **Analysis:** AnalystDashboardService, AnalystFeedbackService, ContextAnalysisService
- **Graph:** EntityLinkingService, EntityCorrelationEngine, GNNService
- **Search:** FederatedSearchService, GlobalIngestor
- **And many more:** 50+ additional specialized services

---

# KEY PACKAGES

## ORCHESTRATION & WORKFLOW

| Package | Purpose | Key Dependencies |
|---------|---------|------------------|
| **maestro-core** | Core orchestration engine | AWS SDK, OpenTelemetry, pg, axios, jsdom |
| **maestro-cli** | CLI interface | maestro-core |
| **maestroflow** | Workflow DSL | Flow definitions |

---

## PROVENANCE & AUDIT

| Package | Purpose | Export |
|---------|---------|--------|
| **prov-ledger-sdk** | TypeScript SDK for prov-ledger | Ledger client, types |
| **prov-ledger-client** | Client library | Ledger interactions |
| **prov-ledger** | Package version | Ledger exports |
| **policy-audit** | Compliance tracking | Policy audit functions |

---

## AUTHORITY & POLICY

| Package | Purpose | Key Components |
|---------|---------|-----------------|
| **authority-compiler** | Runtime policy enforcement | compiler.ts, evaluator.ts, middleware.ts, policy.schema.ts |

---

## SDKs & CONNECTORS

| Package | Purpose | Language |
|---------|---------|----------|
| **sdk-ts** | TypeScript SDK | TypeScript |
| **sdk-py** | Python SDK | Python |
| **sdk-python** | Alt Python SDK | Python |
| **sdk** | Multi-language SDK | Multi-language |
| **common-types** | Shared types | TypeScript |
| **connector-sdk** | Connector building SDK | TypeScript |

---

## INTELLIGENCE & ANALYSIS

| Package | Purpose | Integration |
|---------|---------|-------------|
| **graphai** | AI-enhanced graphs | Graph algorithms |
| **graph-ai-core** | Graph AI core | ML models |
| **narrative-engine** | Narrative generation | Story generation |
| **govbrief** | Government briefing | Brief generation |
| **finintel** | Financial intelligence | Transaction analysis |
| **cyberintel** | Cybersecurity intel | Cyber threat analysis |
| **osint** | Open source intel | Web scraping |
| **influence-mining** | Influence analysis | Network analysis |
| **deception-detector** | Deception detection | Misinfo detection |
| **psyops-module** | Psych ops analysis | Cognitive bias detection |

---

## DOMAIN-SPECIFIC PACKAGES

| Package | Purpose | Use Case |
|---------|---------|----------|
| **event-booster** | Event processing | Event enrichment |
| **liquid-nano** | Template engine | Template processing |
| **mapping-dsl** | Data mapping DSL | Schema mapping |
| **jira-integration** | Jira integration | Project management |
| **lreg-exporter** | License registry export | License tracking |
| **hit-protocol** | Integration protocol | Standard protocol |
| **hrn** | Hierarchical resource names | Resource identification |

---

## INFRASTRUCTURE PACKAGES (13+)

| Package | Purpose |
|---------|---------|
| **adc** | Application data catalog |
| **aer-ledger** | Application event ledger |
| **afl-store** | Application flow store |
| **atl** | Application template library |
| **canary-lattice** | Canary deployment |
| **canonical-entities** | Entity definitions |
| **contracts** | API contracts |
| **crsp** | Compliance risk scoring |
| **gdr** | Global data registry |
| **gateway-tariff** | API tariffing |
| **gml** | Graph modeling language |
| **geo** / **geotemporal** | Geographic data |

---

## SERVER MIDDLEWARE (`/server/src/middleware/`)

### Authentication & Authorization
- `auth.ts` - OIDC/JWT validation
- `opa-abac.ts` - OPA-based ABAC enforcement ★ CRITICAL
- `opa-enforcer.ts` - OPA policy wrapper
- `opa-with-appeals.ts` - OPA with appeal mechanism
- `authority.ts` - Authority verification
- `rbac.ts` - Role-based access control
- `spiffe-auth.ts` - SPIFFE identity

### Audit & Compliance
- `audit-logger.ts` - Audit event logging ★ CRITICAL
- `pii-redaction.ts` - PII masking
- `dlpMiddleware.ts` - Data loss prevention
- `rfa.ts` - Reason-for-access validation

### Security & Control
- `rateLimit.ts` / `rateLimiting.ts` - Rate limiting
- `requestId.ts` - Request correlation
- `tenantValidator.ts` / `tenantAllowlist.ts` - Tenant isolation
- `graphql-authz.ts` - GraphQL authorization
- `graphql-hardening.ts` - GraphQL hardening
- `input-validation.ts` - Input validation
- `security.ts` - General security

### Supporting
- `observability/` - OpenTelemetry
- `withAuthAndPolicy.ts` - Combined middleware

---

## GRAPHQL RESOLVERS (`/server/src/graphql/`)

### Main Resolvers (30+)
- `resolvers.ts` - Main
- `resolvers-combined.ts` - Combined
- `resolvers.graphops.ts` - Graph ops
- `resolvers.graphAnalytics.ts` - Analytics
- `resolvers.ai.ts` - AI/LLM
- `resolvers.copilot.ts` - Copilot
- `resolvers.er.ts` - Entity resolution
- `intelgraph/resolvers.ts` - IntelGraph core
- `conductor/resolvers.ts` - Conductor
- `modules/core/resolvers.ts` - Core modules

### Plugins
- `auditLogger.ts` ★ Records all GraphQL ops
- `dlpPlugin.ts` - DLP enforcement
- `persistedQueries.ts` - Caching
- `requireBudgetPlugin.ts` - Budget enforcement
- `resolverMetrics.ts` - Performance metrics

### Schemas
- `schema.provenance.ts` - Provenance types
- `schema.trust-risk.ts` - Trust/risk types
- `intelgraph/schema.ts` - Core schema

---

## CRITICAL FILES FOR STRATEGIC IMPLEMENTATION

### Provenance
- **prov-ledger:** `/services/prov-ledger/src/index.ts`
- **conductor ledger:** `/services/conductor/src/provenance/ledger.ts`

### Authorization
- **authz-gateway:** `/services/authz-gateway/src/index.ts` & `policy.ts`
- **authority-compiler:** `/packages/authority-compiler/src/`
- **OPA ABAC:** `/server/src/middleware/opa-abac.ts`

### Audit
- **API audit:** `/services/api/src/middleware/auditLog.ts`
- **GraphQL audit:** `/server/src/graphql/plugins/auditLogger.ts`
- **Audit Lake:** `/services/auditlake/src/audit-lake-engine.ts`

### Policy
- **OPA integration:** `/server/src/middleware/opa*.ts`
- **Policy audit:** `/services/policy-audit/src/`
- **Compliance:** `/services/compliance/`

---

## ENVIRONMENT VARIABLES FOR INTEGRATION

```bash
# Authorization & Policy
OPA_URL=http://localhost:8181/v1/data/summit/abac/decision
POLICY_DRY_RUN=false
JWT_SECRET=<secret>

# Service URLs
PROV_LEDGER_URL=http://prov-ledger:4010
AUTHZ_GATEWAY_URL=http://authz-gateway:4000
GRAPH_SERVICE_URL=http://graph-core:4001
GRAPH_XAI_URL=http://graph-xai:4002

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/summit
NEO4J_URL=neo4j://localhost:7687

# Compliance & Retention
RETENTION_DEFAULT=standard-365d
COMPLIANCE_MODE=strict
```

---

## QUICK INTEGRATION CHECKLIST

- [ ] Map all 154 services to infrastructure
- [ ] Configure OPA for policy evaluation
- [ ] Set up prov-ledger PostgreSQL
- [ ] Link all services to auth-gateway
- [ ] Implement audit-log aggregation
- [ ] Configure compliance reporting
- [ ] Set up observability (OTEL)
- [ ] Implement GraphQL plugins for audit
- [ ] Configure rate limiting
- [ ] Set up PII redaction
- [ ] Implement DLP policies
- [ ] Configure tenant isolation
- [ ] Link authority-compiler to OPA
- [ ] Set up GraphQL persisted queries
- [ ] Implement budget enforcement

