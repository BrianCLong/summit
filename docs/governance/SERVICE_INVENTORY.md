# Service Inventory & Governance Integration Matrix

## Overview

This document provides a comprehensive inventory of all Summit services and their governance integration points.

## Service Catalog

### Active Services (MVP-4 GA)

These services are currently deployed and subject to active governance controls.

| Service | Port | Governance Hooks | Authority | Provenance | PII Detection |
|---------|------|------------------|-----------|------------|---------------|
| `apps/web` | 3000 | Client-Side | OIDC | Client-Side | None |
| `apps/gateway` | 8080 | Middleware | OPA | Trace-ID | Header-Scan |
| `apps/intelgraph-api` | 4000 | GraphQL | RBAC/ABAC | Ledger | Field-Level |
| `apps/server` | 4000 | Legacy | JWT | Ledger | None |
| `apps/workflow-engine` | N/A | Worker | System | Ledger | None |
| `apps/analytics-engine` | 5000 | RPC | System | Ledger | None |
| `apps/compliance-console`| 3001 | Client-Side | OIDC | Client-Side | None |

### Reserved Service Namespace (Future / Planned)

The following service identifiers are reserved for future roadmap items (PsyOps, Information Warfare, etc.) and are not currently active. Governance controls for these are TBD until activation.

<details>
<summary>View Reserved Namespace</summary>

| Service | Status |
|---------|--------|
| abp | Reserved |
| acc | Reserved |
| addn | Reserved |
| admin | Reserved |
| admin-api | Reserved |
| admin-automation | Reserved |
| agent-execution-platform | Reserved |
| agent-gateway | Reserved |
| agent-runtime | Reserved |
| agentic-mesh-evaluation | Reserved |
| agents | Reserved |
| agsm | Reserved |
| ai-copilot | Reserved |
| ai-marketplace | Reserved |
| ai-nlq | Reserved |
| ai-sandbox | Reserved |
| ai-security-scanner | Reserved |
| ai-service-platform | Reserved |
| alert-engine | Reserved |
| aml | Reserved |
| analytics | Reserved |
| analytics-service | Reserved |
| anomaly | Reserved |
| api | Reserved |
| api-gateway | Reserved |
| approvals | Reserved |
| attest | Reserved |
| audio-service | Reserved |
| audit | Reserved |
| audit-blackbox-service | Reserved |
| audit-log | Reserved |
| audit_svc | Reserved |
| auditlake | Reserved |
| auth | Reserved |
| auth-gateway | Reserved |
| authenticity-service | Reserved |
| authz-gateway | Reserved |
| autonomy | Reserved |
| autonomy-sandbox | Reserved |
| autonomy-tier3 | Reserved |
| autoscale | Reserved |
| backfill | Reserved |
| backup-encryption | Reserved |
| battle-api | Reserved |
| battle-command-service | Reserved |
| battle-fusion-service | Reserved |
| battle-ingest-service | Reserved |
| billing | Reserved |
| biometric-service | Reserved |
| bitemporal | Reserved |
| blockchain | Reserved |
| brief | Reserved |
| broker | Reserved |
| build-hub | Reserved |
| bundle-pipeline-service | Reserved |
| cab | Reserved |
| case-report | Reserved |
| cases | Reserved |
| catalog-service | Reserved |
| cdr-gateway | Reserved |
| cep | Reserved |
| chatops | Reserved |
| citizen-ai | Reserved |
| citizen-service | Reserved |
| client | Reserved |
| cloud-orchestrator | Reserved |
| cloud-platform-service | Reserved |
| coa-planner | Reserved |
| collab | Reserved |
| collaboration-service | Reserved |
| common | Reserved |
| companyos-sync | Reserved |
| compliance | Reserved |
| compliance-evaluator | Reserved |
| conductor | Reserved |
| confidential | Reserved |
| config-service | Reserved |
| control-tower-service | Reserved |
| copilot | Reserved |
| cost-guard | Reserved |
| cost-optimization | Reserved |
| counterterrorism-service | Reserved |
| crm | Reserved |
| crp | Reserved |
| crypto | Reserved |
| crypto-service | Reserved |
| csr | Reserved |
| cyber-intel-service | Reserved |
| dashboard-service | Reserved |
| data-discovery-fusion | Reserved |
| data-factory-service | Reserved |
| data-marketplace | Reserved |
| data-monetization-engine | Reserved |
| data-pool | Reserved |
| data-quality | Reserved |
| data-spine | Reserved |
| datalab-service | Reserved |
| deception-detection-service | Reserved |
| decision-api | Reserved |
| deepfake-detection-service | Reserved |
| detect | Reserved |
| dev-gateway | Reserved |
| dialectic-agents | Reserved |
| digital-twin | Reserved |
| digital-twin-cognition | Reserved |
| diplomacy-service | Reserved |
| disaster-recovery | Reserved |
| disclosure | Reserved |
| disclosure-packager | Reserved |
| distributed-registry | Reserved |
| dl-training-service | Reserved |
| dlc | Reserved |
| docling-svc | Reserved |
| docs-api | Reserved |
| dp | Reserved |
| dr-orchestrator | Reserved |
| drift-sentinel | Reserved |
| econ | Reserved |
| edge-gateway | Reserved |
| edge-kit | Reserved |
| edge-orchestrator | Reserved |
| election-integrity-service | Reserved |
| engintel | Reserved |
| enrichment | Reserved |
| enrichment-service | Reserved |
| enterprise | Reserved |
| entity-resolution | Reserved |
| er | Reserved |
| er-service | Reserved |
| escp | Reserved |
| esg-reporting-service | Reserved |
| espionage-service | Reserved |
| etl-service | Reserved |
| evals | Reserved |
| event-bus-service | Reserved |
| evidence | Reserved |
| exp | Reserved |
| exporter | Reserved |
| fabric | Reserved |
| fae | Reserved |
| feature-flags | Reserved |
| federation | Reserved |
| federation-planner | Reserved |
| federation-service | Reserved |
| feed-processor | Reserved |
| fhem | Reserved |
| file-storage-backup | Reserved |
| finance-normalizer-service | Reserved |
| finops | Reserved |
| foreign-intel-service | Reserved |
| foreign-relations-service | Reserved |
| foresight-analysis-service | Reserved |
| fusionhub | Reserved |
| futures-intelligence-service | Reserved |
| ga-adminsec | Reserved |
| ga-forensics | Reserved |
| ga-policy-engine | Reserved |
| gateway | Reserved |
| gateway-service | Reserved |
| geocoding-api | Reserved |
| geoint-threat-platform | Reserved |
| geospatial | Reserved |
| geotemporal-api | Reserved |
| global-integration | Reserved |
| golden-sample | Reserved |
| gov-ai-governance | Reserved |
| govtech-export-engine | Reserved |
| graph | Reserved |
| graph-algos | Reserved |
| graph-analytics | Reserved |
| graph-api | Reserved |
| graph-compute | Reserved |
| graph-core | Reserved |
| graph-db-service | Reserved |
| graph-xai | Reserved |
| graphrag | Reserved |
| graphrag-copilot | Reserved |
| green | Reserved |
| guard | Reserved |
| health-aggregator | Reserved |
| hello-service | Reserved |
| humint-service | Reserved |
| hypothesis-workbench | Reserved |
| i18n-service | Reserved |
| identity-fusion | Reserved |
| identity-spiffe | Reserved |
| idtl | Reserved |
| ig-rl | Reserved |
| ingest | Reserved |
| ingest-adapters | Reserved |
| ingest-orchestrator | Reserved |
| ingest-runner | Reserved |
| ingest-sandbox | Reserved |
| ingest-wizard | Reserved |
| innovation-sandbox | Reserved |
| insight-ai | Reserved |
| insights | Reserved |
| integrations | Reserved |
| intel | Reserved |
| intelgraph-server | Reserved |
| interop | Reserved |
| jitae | Reserved |
| kb-service | Reserved |
| kkp | Reserved |
| knowledge-service | Reserved |
| krpcp | Reserved |
| labeling-service | Reserved |
| lac-compiler | Reserved |
| lakehouse-service | Reserved |
| law-enforcement-service | Reserved |
| learner | Reserved |
| lib | Reserved |
| license-registry | Reserved |
| logging-pipeline | Reserved |
| logistics-automation-service | Reserved |
| lsc | Reserved |
| lsc-service | Reserved |
| market | Reserved |
| marketplace | Reserved |
| mdm-service | Reserved |
| media-pipeline-service | Reserved |
| memory | Reserved |
| mesh-orchestrator | Reserved |
| metadata-service | Reserved |
| mission-coordination-service | Reserved |
| ml-inference | Reserved |
| ml-serving | Reserved |
| ml-training | Reserved |
| mlops-service | Reserved |
| model-hub-service | Reserved |
| model-registry-service | Reserved |
| model-serving-service | Reserved |
| model-training | Reserved |
| mstc | Reserved |
| mtfs | Reserved |
| mtif | Reserved |
| neo4j-backup | Reserved |
| nl-cypher | Reserved |
| nlp-service | Reserved |
| nlq | Reserved |
| nlq-copilot | Reserved |
| nonproliferation-service | Reserved |
| notification-router | Reserved |
| obs-demo-service | Reserved |
| okr | Reserved |
| opa | Reserved |
| operations-c2-service | Reserved |
| ops-guard | Reserved |
| orchestration | Reserved |
| orchestrator | Reserved |
| organized-crime-service | Reserved |
| osint-service | Reserved |
| pca-verifier | Reserved |
| pcpr | Reserved |
| placement | Reserved |
| plugin-executor | Reserved |
| plugin-registry | Reserved |
| policy | Reserved |
| policy-audit | Reserved |
| policy-aware-cache | Reserved |
| policy-compiler | Reserved |
| policy-enforcer | Reserved |
| policy-engine | Reserved |
| policy-sidecar | Reserved |
| policyhub | Reserved |
| portfolio | Reserved |
| postgres-pitr | Reserved |
| postmortem | Reserved |
| prd-generator | Reserved |
| predictd | Reserved |
| prediction-service | Reserved |
| predictive-analytics | Reserved |
| prer | Reserved |
| privacy | Reserved |
| privacy-analytics-service | Reserved |
| privacy-labeler | Reserved |
| procurement-automation | Reserved |
| program | Reserved |
| prov-ledger | Reserved |
| provenance | Reserved |
| provenance-cli | Reserved |
| provenance-service | Reserved |
| proxy | Reserved |
| psi | Reserved |
| q3c | Reserved |
| qawe | Reserved |
| qpg | Reserved |
| quantum-service | Reserved |
| queue-manager | Reserved |
| rag | Reserved |
| rca | Reserved |
| rcsi | Reserved |
| realtime | Reserved |
| receipt-signer | Reserved |
| receipt-worker | Reserved |
| red-team-service | Reserved |
| redteam | Reserved |
| ref-data-service | Reserved |
| regulatory-compliance-agents | Reserved |
| release | Reserved |
| releaseorchestrator | Reserved |
| replicator | Reserved |
| repograph | Reserved |
| report-assembly | Reserved |
| reporting | Reserved |
| resilient-orchestrator | Reserved |
| retentiond | Reserved |
| risk-assessment-service | Reserved |
| rlhf | Reserved |
| router | Reserved |
| routing-gateway | Reserved |
| rules | Reserved |
| runbook-prover | Reserved |
| runbooks | Reserved |
| safe-analytics-workbench | Reserved |
| safejoin | Reserved |
| sandbox | Reserved |
| sandbox-gateway | Reserved |
| sandbox-tenant-profile | Reserved |
| satellite | Reserved |
| scenario-engine-service | Reserved |
| scenario-registry | Reserved |
| scheduler | Reserved |
| schema-ingest-wizard | Reserved |
| schema-registry | Reserved |
| scim | Reserved |
| scoring-engine | Reserved |
| scout | Reserved |
| search | Reserved |
| search-indexer | Reserved |
| secure-elections | Reserved |
| sei | Reserved |
| sei-collector | Reserved |
| self-upgrading-infrastructure | Reserved |
| server | Reserved |
| sigint-service | Reserved |
| sigint-telemetry | Reserved |
| signal-bus-service | Reserved |
| sim | Reserved |
| smart-contracting-service | Reserved |
| spacetime-service | Reserved |
| spar | Reserved |
| sparql-endpoint | Reserved |
| spom | Reserved |
| src | Reserved |
| sss | Reserved |
| stix-taxii-ingestion | Reserved |
| strategic-foresight | Reserved |
| stream-processor | Reserved |
| streaming-ingest | Reserved |
| sum | Reserved |
| supply-chain-service | Reserved |
| sync-service | Reserved |
| synthdata | Reserved |
| synthesis-service | Reserved |
| synthesizer | Reserved |
| talent-magnet | Reserved |
| tats | Reserved |
| tenant-admin | Reserved |
| tgo | Reserved |
| threat-assessment-service | Reserved |
| threat-hunting-service | Reserved |
| threat-library-service | Reserved |
| time | Reserved |
| timeseries-metrics | Reserved |
| tpfr | Reserved |
| transcription-service | Reserved |
| trr | Reserved |
| trust | Reserved |
| twin | Reserved |
| unified-audit | Reserved |
| universal-ingestion | Reserved |
| vision-api | Reserved |
| warehouse-service | Reserved |
| web-agent | Reserved |
| web-ingest | Reserved |
| web-orchestrator | Reserved |
| websocket-server | Reserved |
| wmd-intelligence-service | Reserved |
| worker | Reserved |
| worker-queue | Reserved |
| workers | Reserved |
| workflow | Reserved |
| zk-deconfliction | Reserved |
| zk-tx | Reserved |
| zk-tx-svc | Reserved |
| zktx | Reserved |

</details>

### Data Stores

| Store | Port | Purpose | Backup | Encryption |
|-------|------|---------|--------|------------|
| Neo4j | 7687 | Graph database | Daily | At-rest |
| PostgreSQL | 5432 | Relational data | Hourly | At-rest |
| Redis | 6379 | Cache/sessions | N/A | In-transit |
| TimescaleDB | 5433 | Time-series | Daily | At-rest |

### Connectors

| Connector | Type | Auth Method | Rate Limit | Governance |
|-----------|------|-------------|------------|------------|
| OFAC | Sanctions | API Key | 100/min | ✅ |
| GLEIF | Corporate | OAuth2 | 1000/min | ✅ |
| OpenCorporates | Corporate | API Key | 500/min | ✅ |
| WorldCheck | Screening | OAuth2 | 200/min | ✅ |
| DowJones | News/Risk | OAuth2 | 100/min | ✅ |
| SEC EDGAR | Filings | None | 10/sec | ✅ |
| OpenSanctions | Sanctions | API Key | 60/min | ✅ |
| UN Lists | Sanctions | None | 10/min | ✅ |
| EU Lists | Sanctions | None | 10/min | ✅ |
| Wikidata | Reference | None | 50/min | ✅ |
| RSS Feeds | News | None | N/A | ✅ |
| LinkedIn | Social | OAuth2 | 100/day | ✅ |
| Import/CSV | Batch | N/A | N/A | ✅ |

## Governance Integration Points

### 1. GraphQL API (Port 4000)

```typescript
// Integration location: server/src/graphql/middleware/governance.ts
import {
  createGraphQLGovernanceMiddleware,
} from '@intelgraph/governance-hooks';

const governance = createGraphQLGovernanceMiddleware(config, {
  authorityEvaluator,
  provenanceRecorder,
  auditLogger,
});

// Apply to schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  plugins: [governance],
});
```

**Hooks Applied:**
- `AuthorityHook`: Checks permissions before resolver execution
- `PIIDetectionHook`: Scans inputs/outputs for sensitive data
- `ProvenanceHook`: Records data lineage for queries/mutations
- `AuditHook`: Logs all operations for compliance

### 2. Copilot Service (Port 4002)

```typescript
// Integration location: services/copilot/src/middleware/governance.ts
import {
  createCopilotGovernanceMiddleware,
} from '@intelgraph/governance-hooks';

const governance = createCopilotGovernanceMiddleware(config, {
  costTracker,
  citationTracker,
  provenanceRecorder,
});
```

**Hooks Applied:**
- `ValidationHook`: Validates queries against policy
- `CostControlHook`: Enforces token/cost limits
- `CitationHook`: Ensures evidence-backed responses
- `ProvenanceHook`: Records AI operations

### 3. RAG Service (Port 4003)

```typescript
// Integration location: services/rag/src/middleware/governance.ts
import {
  createRAGGovernanceMiddleware,
} from '@intelgraph/governance-hooks';

const governance = createRAGGovernanceMiddleware(config, {
  authorityFilter,
  provenanceRecorder,
});
```

**Hooks Applied:**
- `AuthorityFilterHook`: Filters chunks by user clearance
- `CompartmentHook`: Enforces need-to-know
- `ProvenanceHook`: Tracks retrieval lineage

### 4. Connector Layer

```typescript
// Integration location: connectors/src/middleware/governance.ts
import {
  createConnectorGovernanceMiddleware,
} from '@intelgraph/governance-hooks';

const governance = createConnectorGovernanceMiddleware(config, {
  authManager,
  rateLimiter,
  provenanceRecorder,
});
```

**Hooks Applied:**
- `AuthHook`: Manages connector credentials
- `RateLimitHook`: Enforces API limits
- `ProvenanceHook`: Records external data sources

## Authority Evaluation Flow

```
┌─────────────────┐
│   User Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extract Context│
│  - User ID      │
│  - Roles        │
│  - Tenant       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Policy Evaluator│
│  - Check RBAC   │
│  - Check ABAC   │
│  - Check License│
└────────┬────────┘
         │
    ┌────┴────┐
    │ Allowed?│
    └────┬────┘
    Yes  │  No
    ▼    ▼
┌─────┐ ┌─────────┐
│Exec │ │Deny w/  │
│     │ │Reason   │
└─────┘ └─────────┘
```

## Provenance Recording Points

| Operation | Agent | Activity | Entities |
|-----------|-------|----------|----------|
| Entity Create | User | CREATE | Entity |
| Entity Update | User | UPDATE | Entity, PrevVersion |
| Entity Merge | System | MERGE | Source1, Source2, Result |
| Connector Fetch | Connector | FETCH | ExternalSource, Entity |
| AI Inference | Copilot | INFERENCE | Input, Model, Output |
| Export | User | EXPORT | ExportManifest, Entities |
| Search | User | SEARCH | Query, Results |

## Compliance Mapping

| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| Access Control (NIST AC-3) | Authority Compiler | Audit logs |
| Audit Logging (NIST AU-2) | Audit Hook | Log review |
| Data Protection (GDPR Art 25) | PII Detection | Scans |
| Provenance (SOC2 CC7.2) | Prov-Ledger | Chain verification |
| AI Explainability | Citation Tracker | Coverage metrics |

## Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| GraphQL | `/health` | `{"status": "ok"}` |
| GraphQL | `/health/detailed` | Full status JSON |
| Prov-Ledger | `/health` | `{"status": "ok"}` |
| Copilot | `/health` | `{"status": "ok"}` |
| Neo4j | `:7474/` | Browser loads |
| PostgreSQL | `pg_isready` | Exit 0 |
| Redis | `PING` | `PONG` |

## Metrics & Observability

### Key Metrics

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `authority_evaluations_total` | Counter | decision, reason | Policy enforcement |
| `pii_detections_total` | Counter | type, action | Data protection |
| `provenance_records_total` | Counter | activity | Audit compliance |
| `copilot_tokens_total` | Counter | model, user | Cost tracking |
| `connector_requests_total` | Counter | connector, status | Integration health |

### Dashboards

1. **Governance Overview**: Authority decisions, PII detections, audit events
2. **AI Operations**: Token usage, citation coverage, model performance
3. **Connector Health**: Success rates, latency, rate limit usage
4. **Compliance Status**: Policy violations, audit gaps, remediation

## Next Steps

1. [ ] Complete hook integration in all services
2. [ ] Add E2E governance tests
3. [ ] Implement compliance reporting
4. [ ] Set up alerting for policy violations
5. [ ] Create governance admin dashboard
