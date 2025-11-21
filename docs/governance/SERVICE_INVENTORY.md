# Service Inventory & Governance Integration Matrix

## Overview

This document provides a comprehensive inventory of all Summit services and their governance integration points.

## Service Catalog

### Core Services

| Service | Port | Governance Hooks | Authority | Provenance | PII Detection |
|---------|------|------------------|-----------|------------|---------------|
| GraphQL API | 4000 | ✅ Full | ✅ | ✅ | ✅ |
| Prov-Ledger | 4001 | ✅ Full | ✅ | N/A | ✅ |
| Copilot | 4002 | ✅ Full | ✅ | ✅ | ✅ |
| RAG Service | 4003 | ✅ Full | ✅ | ✅ | ✅ |
| Export Service | 4004 | ✅ Full | ✅ | ✅ | ✅ |

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
} from '@summit/governance-hooks';

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
} from '@summit/governance-hooks';

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
} from '@summit/governance-hooks';

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
} from '@summit/governance-hooks';

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
