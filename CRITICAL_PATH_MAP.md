# Integration Critical Path Map
**Generated:** 2026-01-19
**Branch:** `claude/setup-staff-engineer-role-ayWTk`
**Mission:** IG-101 → MC-205 → CO-58 + SB-33 (parallel)

---

## Executive Summary

**Status:** All four services are operational but **NOT integrated**. Each service has its own API surface, persistence layer, and test infrastructure. The critical path requires building adapters and contracts to connect:

```
Switchboard → IntelGraph → Maestro → CompanyOS
(ingestion)   (canonical)  (orchestrate) (product API)
```

**Key Finding:** Services exist in isolation with no shared event bus, API gateway, or unified contract repository. Integration requires:
1. Unified contract package
2. Cross-service adapters
3. End-to-end integration tests
4. Versioned API contracts

---

## Service Inventory

### IntelGraph (IG) - Canonical Graph Model
**Location:** `/intelgraph/`
**Tech Stack:** Neo4j, GraphQL, Redis, Python/FastAPI
**API Port:** TBD (from environment)
**Package Version:** 2.0.0

**Persistence:**
- **Database:** Neo4j (graph database)
- **Cache:** Redis (ioredis)
- **Schema:** Entities, Claims, Decisions, Sources (provenance)

**API Surface (Python FastAPI):**
```
POST   /entities              - Create entity
GET    /entities              - List entities
GET    /entities/{id}/context - Entity context with claims/decisions
POST   /claims                - Create claim
GET    /claims                - List claims
POST   /decisions             - Create decision
GET    /decisions             - List decisions
GET    /health                - Health check
```

**Key Files:**
- `/intelgraph/api.py` - FastAPI REST endpoints
- `/intelgraph/server/src/config/database.js` - Neo4j + Redis config
- `/intelgraph/packages/contracts/` - Type definitions

**Test Status:** ✓ Unit tests present

---

### CompanyOS (CO) - Product-Facing Operational API
**Location:** `/companyos/`
**Tech Stack:** PostgreSQL (maestro schema), Express, TypeScript
**API Port:** 4100 (companyos-api)
**Package Version:** 2.0.0

**Persistence:**
- **Database:** PostgreSQL
  - Schema: `maestro` (incidents, deployments, alerts, slo_violations, runbooks, etc.)
  - Schema: `companyos` (tenant lifecycle, disclosure packs)
- **Adapter:** `/companyos/services/companyos-api/src/db.ts` (pg.Pool)

**API Surface (Express REST):**
```
GET    /incidents              - List incidents
POST   /incidents              - Create incident
PATCH  /incidents/:id          - Update incident
POST   /incidents/:id/resolve  - Resolve incident
GET    /deployments            - List deployments
POST   /deployments            - Create deployment
POST   /deployments/:id/rollback - Rollback
GET    /alerts                 - List alerts
POST   /alerts/:id/acknowledge - Acknowledge alert
GET    /dashboard              - Unified dashboard
GET    /metrics                - Prometheus metrics
GET    /health                 - Health check
```

**Webhook Integrations:**
- `POST /api/companyos/github-webhook` - GitHub issues/deployments
- `POST /api/companyos/prometheus-webhook` - Prometheus alerts

**Key Files:**
- `/companyos/src/api/index.ts` - Main API router
- `/companyos/src/api/incidentRoutes.ts` - Incident endpoints
- `/companyos/src/api/deploymentRoutes.ts` - Deployment endpoints
- `/companyos/services/companyos-api/src/db.ts` - Database adapter

**Test Status:** ✓ 104+ test cases (health, incidents, tenants)

---

### Maestro Conductor (MC) - Orchestration Service
**Location:** `/orchestration/`
**Tech Stack:** Go (runtime), TypeScript (intent engine), PostgreSQL
**API Port:** 8080 (chronosd runtime)
**Package Version:** 2.0.0

**Persistence:**
- **Database:** PostgreSQL (workflow execution state)
- **Adapter:** `/orchestration/runtime/internal/state/store.go`

**API Surface (Go HTTP):**
```
POST   /v1/start              - Start workflow execution
GET    /v1/status/{runId}     - Check execution status
```

**Workflow Format:**
```yaml
apiVersion: chronos.v1
kind: Workflow
metadata:
  name: <workflow-name>
  namespace: <namespace>
spec:
  tasks:
    - id: <task-id>
      uses: <action-ref>
      with: <params>
      needs: [dependencies]
```

**Components:**
- **Intent Engine:** `/orchestration/packages/intent-engine/` (TypeScript)
  - Compiles YAML → DAG IR
  - CLI: `chronos-intent`
  - Exports: `compileToIR()`, `parseWorkflow()`, `yamlToIR()`
- **Runtime:** `/orchestration/runtime/` (Go)
  - HTTP server
  - PostgreSQL state persistence
  - OpenTelemetry instrumentation

**Key Files:**
- `/orchestration/runtime/cmd/chronosd/main.go` - Runtime entry point
- `/orchestration/runtime/internal/engine/executor.go` - Workflow execution
- `/orchestration/packages/intent-engine/src/compiler.ts` - IR compiler

**Test Status:** ✓ Makefile test targets, vitest config

---

### Switchboard (SB) - Ingestion/Routing Service
**Location:** `/ingestion/`
**Tech Stack:** Python, multiple source adapters
**API Port:** TBD
**Package Version:** N/A (Python)

**Persistence:**
- **Database:** PostgreSQL (contract state, metadata)
- **Schema:** `/db/switchboard/schema.sql`

**Ingestors:**
- CSV ingestor
- HTTP endpoint ingestor
- STIX/TAXII data ingestion
- RSS feed ingestion
- Twitter data ingestion
- Pastebin scraping

**Contract Framework:**
- **Location:** `/ingestion/contracts/`
- **Capabilities:**
  - Specification registry
  - Certification tracking
  - Audit logging
  - Drift detection
  - Quarantine management

**Key Files:**
- `/ingestion/main.py` - Entry point
- `/ingestion/streaming_worker.py` - Async ingestion worker
- `/ingestion/contracts/registry.ts` - Spec registry
- `/ingestion/ingestors/http.py` - HTTP ingestor

**Test Status:** ✓ Basic tests

---

## Communication Patterns

### Current State
| Source | Target | Method | Status |
|--------|--------|--------|--------|
| GitHub | CompanyOS | Webhook (HMAC-signed) | ✓ Operational |
| Prometheus | CompanyOS | Webhook | ✓ Operational |
| **Switchboard** | **IntelGraph** | **MISSING** | ✗ Gap |
| **IntelGraph** | **CompanyOS** | **MISSING** | ✗ Gap |
| **Maestro** | **CompanyOS** | **MISSING** | ✗ Gap |
| **CompanyOS** | **Maestro** | **MISSING** | ✗ Gap |

### Missing Infrastructure
- ✗ API Gateway (unified entry point)
- ✗ Service mesh (inter-service RPC)
- ✗ Event bus (Kafka/RabbitMQ)
- ✗ Service registry (dynamic discovery)
- ✗ Unified contract repository

---

## Contract Repositories (Scattered)

| Location | Scope | Tech |
|----------|-------|------|
| `/contracts/` | Service contract tests (maestro-contract-tests) | TypeScript, Vitest, AJV |
| `/intelgraph/packages/contracts/` | IntelGraph type definitions | TypeScript |
| `/ingestion/contracts/` | Ingestion specifications | TypeScript |

**Gap:** No unified, versioned contract package shared across all services.

---

## Critical Gaps & Blockers

### Integration Gaps
1. **Switchboard → IntelGraph:** No ingestion pipeline to canonical graph
2. **IntelGraph → Maestro:** No graph queries triggerable from workflows
3. **Maestro → CompanyOS:** No orchestrated incident response workflows
4. **CompanyOS → IntelGraph:** No entity/claim enrichment for incidents

### Technical Debt
- Hardcoded service URLs (no discovery)
- HTTP-only communication (no gRPC/event bus)
- Scattered contract definitions
- No API versioning strategy
- No shared authentication layer

### Test Gaps
- ✗ Cross-service integration tests
- ✗ Contract compatibility tests (across IG/MC/CO/SB)
- ✗ End-to-end smoke tests
- ✗ CI gate for contract drift

---

## Database Landscape

| Service | Technology | Schema | Notes |
|---------|-----------|--------|-------|
| IntelGraph | Neo4j | N/A (graph) | Entities, Claims, Decisions |
| CompanyOS | PostgreSQL | `maestro`, `companyos` | Incidents, Deployments, Alerts, Tenants |
| Maestro | PostgreSQL | (default) | Workflow execution state |
| Switchboard | PostgreSQL | `switchboard` | Ingestion state, contracts |

---

## Proposed Integration Architecture

```
┌─────────────────┐
│  Switchboard    │  Ingests external data
│  (SB-33)        │  - HTTP/RSS/STIX/TAXII/CSV
└────────┬────────┘
         │ Normalized Payload
         │ (Idempotent, Provenance)
         ▼
┌─────────────────┐
│  IntelGraph     │  Canonical graph model
│  (IG-101)       │  - Entities/Edges
│                 │  - Claims/Decisions
│                 │  - Provenance ledger
└────────┬────────┘
         │ Graph Queries
         │ (Entity context, relationships)
         ▼
┌─────────────────┐
│  Maestro        │  Orchestration layer
│  (MC-205)       │  - Workflow execution
│                 │  - Step chaining
│                 │  - Retry/error handling
└────────┬────────┘
         │ Orchestrated Results
         │ (Run ID, outputs)
         ▼
┌─────────────────┐
│  CompanyOS      │  Product API
│  (CO-58)        │  - POST /v1/insights/quick
│                 │  - Returns: entities, edges, summary
└─────────────────┘
```

---

## Critical Path Definition

### Minimal Viable Slice
**One entity type, one edge type, one ingest path, one query, one workflow, one API endpoint.**

**Proposal:**
- **Entity:** `Person` (with `id`, `name`, `email`, `source`, `confidence`)
- **Edge:** `ASSOCIATED_WITH` (Person ↔ Person)
- **Ingest:** CSV upload → Switchboard → IntelGraph upsert
- **Query:** Get person by ID + associated persons
- **Workflow:** "Person Network Analysis" (ingest → query → summarize)
- **API:** `POST /v1/insights/person-network` → returns person + associations + summary

---

## Current Build Status

**Branch:** `claude/setup-staff-engineer-role-ayWTk`
**Latest Commit:** `bd79d654` fix(ci): update gitleaks-action to v2 API
**Status:** Clean working tree ✓
**Package Versions:** All major services at 2.0.0 ✓
**CI/CD:** Reusable workflows in `.github/workflows/` ✓

---

## Next Steps → PR Plan

See `PR_PLAN.md` for the detailed atomic PR series (PR-1 through PR-6).

**Immediate Action:** Implement PR-1 (Unified Contracts Package)
