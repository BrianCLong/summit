# Summit Codebase Service Inventory - Documentation Guide

**Generated:** November 21, 2025  
**Status:** Complete & Ready for Integration  
**Total Documentation:** 2,000+ lines across 3 files

---

## Overview

This comprehensive service inventory documents all 154 microservices and 62 packages in the Summit platform, with a focus on:

1. **Provenance & Audit** - Claims ledger, audit trails, lineage tracking
2. **Authorization & Policy** - OPA-based ABAC, authority enforcement
3. **Data Management** - Graph storage, entity resolution
4. **Orchestration** - Workflow management, conductor-based automation
5. **Intelligence APIs** - GraphQL, knowledge services
6. **Security & Compliance** - Privacy controls, DLP, regulatory compliance

---

## Documentation Files Created

### 1. SERVICE_INVENTORY.md (39 KB, 1,428 lines)
**Comprehensive Reference - START HERE**

Contains detailed documentation for:
- **PART 1:** 32 key services documented with:
  - Entry points
  - Technology stacks
  - Dependencies
  - API endpoints
  - Key features & components
  
- **PART 2:** 49 packages documented with:
  - Purpose & location
  - Key dependencies
  - Integration points
  
- **PART 3:** Server structure:
  - 50+ middleware files
  - 30+ resolver files
  - 150+ server services
  - GraphQL schemas & plugins
  
- **PART 4:** Provenance & audit code
- **PART 5:** Policy & authorization code
- **PART 6:** API endpoints & GraphQL schema
- **PART 7:** Technology stack summary
- **PART 8:** Strategic implementation recommendations

**Use this for:** Deep dives, architecture understanding, integration planning

---

### 2. INTEGRATION_POINTS.md (8 KB, 328 lines)
**Integration Patterns & Workflows - FOR IMPLEMENTATION**

Contains:
- **5 Critical Integration Hubs:**
  1. Authorization Hub (authz-gateway)
  2. Provenance Hub (prov-ledger)
  3. Audit Hub (audit-log/auditlake)
  4. Orchestration Hub (conductor)
  5. API Hub (api-gateway)

- **Cross-Service Integration Flows:**
  - Authorization → Provenance flow
  - Data Access → Audit → Provenance flow
  
- **Key Packages for Integration:**
  - authority-compiler
  - prov-ledger-sdk
  - maestro-core
  
- **Middleware Integration Chain:**
  - Recommended order (9 steps)
  - Example Express setup
  
- **Environment Variables** (all required)
- **Common Integration Patterns** (4 major patterns)
- **Testing Integration Points** (unit + integration tests)
- **Monitoring Integration Health** (health checks, metrics)

**Use this for:** Setting up integrations, configuring services, testing

---

### 3. SERVICE_QUICK_REFERENCE.md (13 KB, 340 lines)
**Quick Lookup Tables - FOR NAVIGATION**

Contains searchable tables for:
- Provenance & Audit Services (4)
- Authorization & Policy Services (3)
- Graph & Data Services (4)
- Orchestration & Workflow Services (4)
- API Gateway & Integration Services (2)
- Intelligence & Analysis Services (4)
- Processing & Transformation Services (5)
- Data Quality & Validation Services (2)
- Specialized Services (5)
- **100+ Additional Services** (listed by category)

Plus tables for:
- Key Packages (orchestration, provenance, authority, SDKs, intelligence)
- Server Middleware (35+ files)
- GraphQL Resolvers (30+ files)
- Critical Files for Implementation
- Environment Variables
- Quick Integration Checklist

**Use this for:** Finding specific services, locating entry points, quick reference

---

## Key Findings Summary

### Architecture Highlights

#### 1. Provenance System ★★★
- **Central Hub:** `prov-ledger` (Fastify + PostgreSQL)
- **Claim-based tracking** with cryptographic verification
- **Lineage tracking** through transforms and sources
- **Policy enforcement** requiring authority binding
- **Integration:** All services should emit claims
- **Location:** `/services/prov-ledger/`

#### 2. Authorization System ★★★
- **Gateway:** `authz-gateway` (Express + JOSE + OpenTelemetry)
- **Policy Engine:** OPA (Open Policy Agent)
- **Decision:** Allow/Deny with obligations
- **Models:** RBAC + ABAC + SPIFFE
- **Features:** Step-up authentication, attribute caching
- **Location:** `/services/authz-gateway/`

#### 3. Audit System ★★★
- **In-Service:** Circular buffer audit logs (API service)
- **Centralized:** audit-log service
- **Aggregated:** auditlake engine
- **GraphQL Plugin:** auditLogger.ts (all mutations)
- **Integration:** All should hook into audit trail
- **Location:** `/services/audit-log/`, `/services/auditlake/`

#### 4. Orchestration System ★★
- **Engine:** Conductor with provenance ledger
- **Pipeline Steps:** router → generator → critic → evaluator → normalizer → planner → coordinator
- **Policy Routing:** Decisions at each step
- **Plugin System:** Extensible architecture
- **Location:** `/services/conductor/`

#### 5. API Layer ★★
- **GraphQL Gateway:** apollo server with Express
- **Delegation Model:** Routes to specialized services
- **Security:** Policy middleware chain
- **GraphQL Plugins:** Audit, DLP, budget, metrics
- **Location:** `/services/api-gateway/`

---

## Technology Stack Overview

### Languages
- **TypeScript** - Primary (services, packages)
- **Python** - Data processing, ML, analytics
- **GraphQL** - API definition

### Key Frameworks
- **Express** - Web framework
- **Apollo Server** - GraphQL server
- **Fastify** - High-performance HTTP
- **Neo4j** - Graph database
- **PostgreSQL** - Relational database

### Security & Policy
- **OPA** - Policy evaluation (Open Policy Agent)
- **SPIFFE** - Service identity
- **WebAuthn** - Step-up authentication
- **JOSE** - JWT handling

### Observability
- **OpenTelemetry** - Distributed tracing
- **Jaeger** - Trace backend
- **Prometheus** - Metrics
- **Pino** - Structured logging

---

## Strategic Integration Points

### For Audit & Compliance
1. **Implement prov-ledger** as source of truth
2. **Link all services** to claim creation
3. **Enable auditlake** aggregation
4. **Export manifests** for compliance reports
5. **Track authority binding** (x-authority-id header)

### For Authorization
1. **Configure OPA** with policies
2. **Deploy authz-gateway** as policy decision point
3. **Integrate authority-compiler** for runtime enforcement
4. **Enable step-up** for sensitive operations
5. **Track reason-for-access** in all decisions

### For Observability
1. **Enable OpenTelemetry** in all services
2. **Connect Jaeger** for trace collection
3. **Set up Prometheus** for metrics
4. **Monitor GraphQL resolver** performance
5. **Alert on policy denials**

### For Data Security
1. **Enable PII redaction** middleware
2. **Configure DLP** policies
3. **Implement data residency** controls
4. **Track privacy labels** on data
5. **Enforce consent** reconciliation

---

## Quick Start Integration Checklist

- [ ] Read SERVICE_INVENTORY.md (Parts 1-3)
- [ ] Review INTEGRATION_POINTS.md (Critical hubs)
- [ ] Map all 154 services to infrastructure
- [ ] Deploy prov-ledger + PostgreSQL
- [ ] Deploy authz-gateway + OPA
- [ ] Configure audit-log aggregation
- [ ] Set up GraphQL plugins (audit, DLP, budget)
- [ ] Configure middleware chain (auth → policy → audit)
- [ ] Enable observability (OTEL)
- [ ] Implement compliance export
- [ ] Set up monitoring & alerting
- [ ] Test end-to-end flows
- [ ] Document custom policies
- [ ] Plan rollout strategy

---

## File References

### Most Important Files for Implementation

**Provenance:**
- `/services/prov-ledger/src/index.ts` - Ledger service
- `/services/conductor/src/provenance/ledger.ts` - Conductor provenance
- `/packages/prov-ledger-sdk/` - TypeScript client

**Authorization:**
- `/services/authz-gateway/src/index.ts` - Auth gateway
- `/services/authz-gateway/src/policy.ts` - OPA integration
- `/packages/authority-compiler/src/` - Policy compiler

**Audit:**
- `/services/api/src/middleware/auditLog.ts` - API audit
- `/services/auditlake/src/audit-lake-engine.ts` - Aggregation
- `/server/src/graphql/plugins/auditLogger.ts` - GraphQL audit

**Middleware:**
- `/server/src/middleware/opa-abac.ts` - ABAC enforcement
- `/server/src/middleware/audit-logger.ts` - Audit middleware
- `/server/src/middleware/` - All 50+ middleware files

**GraphQL:**
- `/services/api-gateway/src/index.ts` - GraphQL gateway
- `/server/src/graphql/resolvers.ts` - Main resolvers
- `/server/src/graphql/schema.provenance.ts` - Provenance schema

---

## Environment Configuration Template

```bash
# Core Configuration
NODE_ENV=production
LOG_LEVEL=info

# Authorization & Policy
OPA_URL=http://opa:8181/v1/data/summit/abac/decision
POLICY_DRY_RUN=false
JWT_SECRET=<your-secret>
JWKS_URL=<issuer>/.well-known/jwks.json

# Service URLs
PROV_LEDGER_URL=http://prov-ledger:4010
AUTHZ_GATEWAY_URL=http://authz-gateway:4000
AUDIT_LOG_URL=http://audit-log:4020
GRAPH_SERVICE_URL=http://graph-core:4001
GRAPH_XAI_URL=http://graph-xai:4002

# Databases
DATABASE_URL=postgres://user:pass@postgres:5432/summit
NEO4J_URL=neo4j://neo4j:7687
ELASTICSEARCH_URL=http://elasticsearch:9200

# Observability
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
PROMETHEUS_URL=http://prometheus:9090

# Compliance & Retention
RETENTION_DEFAULT=standard-365d
COMPLIANCE_MODE=strict
AUDIT_EXPORT_SCHEDULE=0 0 * * *

# Headers (Required)
X_AUTHORITY_ID=<service-id>
X_REASON_FOR_ACCESS=<purpose>
```

---

## Next Steps

### Phase 1: Foundational (Week 1-2)
1. Deploy prov-ledger service
2. Configure PostgreSQL & OPA
3. Deploy authz-gateway
4. Enable basic audit logging

### Phase 2: Integration (Week 3-4)
1. Link services to auth-gateway
2. Implement GraphQL plugins
3. Configure middleware chain
4. Enable observability

### Phase 3: Compliance (Week 5-6)
1. Set up audit aggregation
2. Implement compliance export
3. Configure data residency
4. Enable DLP policies

### Phase 4: Operations (Week 7-8)
1. Set up monitoring
2. Configure alerting
3. Implement runbooks
4. Plan incident response

---

## Document Navigation

- **For Architecture Understanding:** Start with SERVICE_INVENTORY.md (PARTS 1-3)
- **For Implementation Details:** Focus on INTEGRATION_POINTS.md
- **For Quick Lookups:** Use SERVICE_QUICK_REFERENCE.md tables
- **For Policies & Auth:** See SERVICE_INVENTORY.md (PARTS 4-5)
- **For APIs:** See SERVICE_INVENTORY.md (PART 6)

---

## Document Statistics

| File | Lines | Size | Purpose |
|------|-------|------|---------|
| SERVICE_INVENTORY.md | 1,428 | 39 KB | Comprehensive reference |
| INTEGRATION_POINTS.md | 328 | 8 KB | Integration workflows |
| SERVICE_QUICK_REFERENCE.md | 340 | 13 KB | Quick lookup tables |
| README_SERVICE_INVENTORY.md | - | - | This guide |
| **TOTAL** | **2,096** | **60 KB** | Complete documentation |

---

## Support & Updates

- **Last Updated:** November 21, 2025
- **Scope:** 154 services, 62 packages, 50+ middleware, 30+ resolvers
- **Focus Areas:** Provenance, Authorization, Audit, Compliance
- **Technology:** TypeScript, Node.js, Python, GraphQL, OPA, Neo4j, PostgreSQL

---

**Ready to integrate?** Start with INTEGRATION_POINTS.md and follow the checklist above.
