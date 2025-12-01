# Summit Codebase: Comprehensive Overview

## Executive Summary

**Summit** is an **AI-augmented intelligence analysis platform** built with a "deployable-first" philosophy. It combines graph analytics, real-time collaboration, and enterprise security for intelligence community use cases. The platform is a **full-stack monorepo** with a TypeScript/Node.js backend, React frontend, and support for GraphQL, REST APIs, and WebSocket subscriptions.

---

## 1. Project Structure Overview

### Core Architecture Type
- **Monorepo** using `pnpm` workspaces with Turbo for build caching
- **Deployable-First Philosophy**: Every merge must maintain working `make up && make smoke` pipeline
- **Package Manager**: pnpm 9.12.0 (enforced via `corepack enable`)
- **Node Version**: 18.18+ required

### Main Directory Layout

```
summit/
├── server/                      # Main GraphQL/REST backend (Express + Apollo)
│   ├── src/
│   │   ├── app.ts             # Express app setup with Apollo Server
│   │   ├── routes/            # 40+ REST route modules (AI, health, webhooks, etc.)
│   │   ├── graphql/           # GraphQL schema definitions & resolvers
│   │   ├── services/          # Business logic (EntityLinking, ExtractionEngine, etc.)
│   │   ├── db/                # Database connectors (Neo4j, PostgreSQL, Redis)
│   │   ├── middleware/        # Auth, audit logging, CORS, RBAC
│   │   ├── ai/                # AI/ML services (extraction, adversary agents, etc.)
│   │   ├── workers/           # Background job processors (BullMQ)
│   │   └── conductor/         # Workflow orchestration
│   └── docker-compose.dev.yml
├── client/                      # React SPA frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── graphql/           # Query files (.graphql) for Apollo Client
│   │   ├── queries/           # Persisted GraphQL operations
│   │   └── hooks/
│   └── package.json
├── apps/                        # Multi-app workspace (web, api, server, etc.)
│   ├── web/                   # Alternative React app with TypeScript/Vite
│   ├── server/                # App-level server instance
│   ├── analytics-engine/      # Graph analytics processing
│   ├── ml-engine/             # ML inference pipeline
│   ├── search-engine/         # Full-text search service
│   ├── graph-analytics/       # Neo4j graph analysis
│   └── ...
├── services/                    # Microservices directory (50+ services)
│   ├── api/                   # API service layer
│   ├── api-gateway/           # Request routing & proxying
│   ├── authz-gateway/         # Authorization enforcement
│   ├── agents/                # AI agent runtime
│   ├── analytics/             # Telemetry & metrics
│   ├── audit/                 # Audit logging
│   ├── ...and 40+ more
├── packages/                    # Shared libraries
│   ├── graph-ai-core/         # Core graph AI logic
│   ├── prov-ledger/           # Provenance tracking
│   ├── policy-audit/          # Policy validation
│   ├── crsp/                  # Cross-realm security protocol
│   ├── maestro-cli/           # CLI tool
│   └── ...and more
├── docs/                        # Documentation
│   ├── ONBOARDING.md
│   ├── ARCHITECTURE.md
│   ├── api-reference/
│   ├── runbooks/
│   └── ...
├── k8s/                         # Kubernetes manifests
│   ├── keda/                  # Autoscaling
│   ├── kyverno/               # Policy enforcement
│   ├── logging/               # Observability
│   └── ...
└── docker-compose.*.yml         # 15+ compose files for different profiles
```

---

## 2. Application Type

### Primary Classification
**Full-Stack Web Application** with:
- **Backend**: GraphQL API (Apollo Server) + REST endpoints (Express)
- **Frontend**: React SPA with Redux state management
- **Real-time**: WebSocket subscriptions (Socket.io, GraphQL-WS)
- **Databases**: Multi-database (Neo4j graph, PostgreSQL relational, Redis cache)
- **AI/ML**: Integrated extraction engines, NLP services, agent runtimes

### Key Use Cases
1. **Investigation & Analysis**: Create investigations, extract entities, discover relationships
2. **Intelligence Collaboration**: Real-time multi-user collaboration on investigations
3. **AI-Powered Insights**: Entity linking, sentiment analysis, link prediction
4. **Workflow Automation**: Orchestrate investigation processes with Maestro
5. **Governance & Compliance**: Audit logging, RBAC, DLP, policy enforcement

---

## 3. APIs & Interfaces

### 3A. GraphQL API (Primary)

**Endpoint**: `http://localhost:4000/graphql` (dev)

**Key Schema Modules**:
```typescript
// Core entities
- Entity (id, type, props, canonicalId)
- Relationship (id, from, to, type, props)
- Investigation (id, name, description)
- User (id, email, username)
- AuditLog (id, userId, action, details)

// AI & Analysis
- ExtractedEntity (text, type, confidence, linkedEntity)
- ExtractedRelationship (sourceId, targetId, type, confidence)
- AIRecommendation (from, to, score, explanation)
- AISuggestionExplanation (score, factors, featureImportances)

// Evidence & Trust
- Evidence (id, content, source, relatedEntities)
- TrustScore (entityId, score, factors)
- ProvenanceRecord (action, actor, timestamp, changes)

// Workflow
- CrisisScenario, NarrativeHeatmap, StrategicResponsePlaybook
```

**Key GraphQL Operations**:
- `Query.entity(id), entities(filter)` - Entity retrieval
- `Query.relationships(filter)` - Relationship discovery
- `Query.investigations(filter)` - Investigation queries
- `Mutation.createEntity, updateEntity, deleteEntity` - Entity mutations
- `Mutation.createRelationship, updateRelationship` - Relationship mutations
- `Subscription.entityUpdated, relationshipAdded` - Real-time subscriptions

**Persisted Queries** (security):
- Located in `/persisted/queries/` and `/graphql/persisted/`
- Used for production to prevent arbitrary query execution
- Examples: `GetUserDashboard.graphql`, `CreateNote.graphql`, `evidenceVerify.graphql`

### 3B. REST API Endpoints (40+ routes)

**Health & Monitoring**:
```
GET  /health                    # Basic health check
GET  /health/detailed           # Detailed service status
GET  /health/ready              # Readiness probe
GET  /health/live               # Liveness probe
GET  /metrics                   # Prometheus metrics
```

**Core Features**:
```
POST /api/ai/extract           # Entity/relationship extraction
POST /api/ai/sentiment         # Sentiment analysis
POST /api/ai/link-predict      # Link prediction

GET  /search/evidence          # Full-text search
POST /api/narrative-sim        # Narrative simulation
POST /api/nl2cypher            # Natural language to Cypher queries

POST /api/copilot              # AI copilot interactions
POST /admin/...                # Admin operations
POST /rbac/...                 # Role-based access control
```

**Integrations**:
```
POST /webhooks/github          # GitHub webhook handler
POST /webhooks/shopify         # Shopify integration
POST /api/n8n                  # n8n workflow integration
POST /api/gitops               # GitOps operations
POST /api/marketplace          # Marketplace integration
```

**Data Operations**:
```
POST /api/disclosures          # Disclosure management
POST /api/export-api           # Data export
POST /api/backfill             # Data backfill operations
POST /api/compliance           # Compliance checks
```

**Note**: All routes are middleware-protected with authentication, rate limiting, and audit logging.

### 3C. WebSocket Protocols

**Socket.io** (real-time collaboration):
- Presence updates (who's viewing what)
- Live investigation updates
- Collaborative graph editing
- Event streaming

**GraphQL-WS** (GraphQL subscriptions):
- Real-time entity/relationship changes
- Investigation activity streams
- Investigation status updates

---

## 4. Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18.18+ |
| API Framework | Express.js | 5.1.0 |
| GraphQL Server | Apollo Server | 5.1.0 |
| Graph Database | Neo4j | 5.24.0 |
| Relational DB | PostgreSQL | 16-alpine |
| Cache Layer | Redis | 7-alpine |
| ORM/Query | Prisma, Knex.js | Latest |
| Job Queue | BullMQ | 5.63.2 |
| Auth/JWT | jsonwebtoken | 9.0.2 |
| Logging | Pino | 10.1.0 |
| Monitoring | OpenTelemetry, Prometheus | Latest |
| Validation | Joi, Zod, express-validator | Latest |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.3.1+ |
| Build Tool | Vite | 7.x |
| Styling | TailwindCSS, Emotion | Latest |
| UI Components | Radix UI, Material-UI | Latest |
| State Management | Redux Toolkit, Zustand | Latest |
| API Client | Apollo Client | 4.x |
| Router | React Router | 7.x |
| Forms | React Hook Form | 7.x |
| Data Grid | MUI X Data Grid | 8.x |
| Visualization | D3.js, Cytoscape, Recharts, Leaflet | Latest |
| Testing | Jest, Vitest, Playwright | Latest |

### DevOps & Infrastructure
| Component | Technology |
|-----------|-----------|
| Container | Docker, Docker Compose |
| Orchestration | Kubernetes (optional) |
| Observability | OpenTelemetry, Prometheus, Grafana, Jaeger |
| Scanning | Trivy, CodeQL, Semgrep, Gitleaks |
| CI/CD | GitHub Actions |
| Package Manager | pnpm 9.12.0 (enforced) |
| Build System | Turbo (monorepo caching) |
| Secrets | SOPS, GitHub Secrets |

### Key Libraries & Tools
```
- graphql-tools, graphql-scalars (GraphQL utilities)
- neo4j-driver (Neo4j connectivity)
- pg, pgvector (PostgreSQL)
- ioredis (Redis client)
- canvas, sharp (Image processing)
- ffmpeg-static, fluent-ffmpeg (Video processing)
- tesseract.js (OCR)
- puppeteer (Browser automation)
- natural, sentiment (NLP)
- socket.io (Real-time)
- helmet (Security headers)
- express-rate-limit (Rate limiting)
- argon2 (Password hashing)
```

---

## 5. Documentation & README Files

### Main Documentation
| File | Purpose |
|------|---------|
| `/README.md` (1030 lines) | **Primary**: Quickstart, architecture, golden path, dev setup |
| `/docs/ONBOARDING.md` | **Critical**: Developer onboarding, deployable-first philosophy, testing |
| `/docs/ARCHITECTURE.md` | System architecture, C4 diagrams, trust boundaries |
| `/REPOSITORY-STRUCTURE.md` | Detailed directory layout and module descriptions |
| `/docs/API_GRAPHQL_SCHEMA.graphql` | GraphQL schema reference |

### Additional Documentation
- `/docs/api-reference/` - API endpoint documentation
- `/docs/coding_standards/` - Coding patterns and style guides
- `/docs/runbooks/` - Operational runbooks
- `/docs/maestro/` - Maestro workflow engine docs
- `/docs/security/` - Security policies and hardening guides
- `/CHANGELOG.md` - Version history and release notes

### Configuration Documentation
- `.env.example` - Development environment variables
- `.env.production.sample` - Production template (with guards)
- `tsconfig.build.json`, `tsconfig.paths.json` - TypeScript configuration
- `.eslintrc.cjs` - Linting rules
- `.prettierrc` - Code formatting

---

## 6. Package.json & Dependencies

### Root `package.json` Highlights
```json
{
  "name": "intelgraph-platform",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "type": "module",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "tsc -b tsconfig.build.json",
    "smoke": "node scripts/smoke-test.js",
    "bootstrap": "make bootstrap",
    
    // Database commands
    "db:migrate": "prisma migrate deploy",
    "db:seed": "ts-node scripts/seed-data.ts",
    "db:reset": "npm run db:migrate && npm run db:seed",
    
    // Deployment
    "deploy:dev": "scripts/deploy.sh dev",
    "deploy:prod": "scripts/deploy.sh prod",
    
    // GraphQL
    "graphql:codegen": "graphql-codegen",
    "persisted:build": "node scripts/graphql/build_persisted_map.js",
    
    // CI/CD
    "ci": "pnpm run lint && pnpm run typecheck && pnpm run test",
    "smoke:ci": "NODE_ENV=test node scripts/smoke-test.js"
  },
  "pnpm": {
    "overrides": {
      "typescript": "^5.3.3",
      "neo4j-driver": "6.0.1",
      "express": "^5.1.0"
    }
  }
}
```

### Key Workspace Packages
```
/server          - GraphQL backend (Express + Apollo)
/client          - React frontend (Vite)
/apps/web        - Alternative React app (TypeScript)
/apps/server     - App-level server
/apps/*          - 10+ specialized apps (analytics, ML, search, etc.)
/services/*      - 50+ microservices
/packages/*      - 50+ shared libraries
```

---

## 7. API Routes & Controllers

### Route Organization (`/server/src/routes/`)

**Core Routes** (40+ files):
```typescript
health.ts              // Health probes
ai.ts                  // AI operations (extraction, analysis)
copilot.ts            // AI copilot interactions
admin.ts              // Administrative operations
auth.ts               // Authentication
rbacRoutes.ts         // Role-based access control
monitoring.ts         // System monitoring
```

**Integration Routes**:
```typescript
github.ts             // GitHub integration & webhooks
github-app.ts         // GitHub App handlers
gitops.ts             // GitOps operations
n8n.ts                // n8n workflow integration
shopify.ts            // Shopify integration
coinbase.ts           // Coinbase payment integration
paypal.ts             // PayPal integration
```

**Feature Routes**:
```typescript
copilot.ts            // AI copilot
narrative-sim.ts      // Narrative simulation
nl2cypher.ts          // NL to Cypher translation
disclosures.ts        // Disclosure management
webhooks.ts           // Webhook handling
marketplace.ts        // Marketplace operations
export-api.ts         // Data export
cost-preview.ts       // Cost estimation
```

### GraphQL Resolvers (`/server/src/graphql/resolvers/`)

**Resolver Modules**:
```typescript
entity.ts             // Entity CRUD operations
relationship.ts       // Relationship operations
user.ts               // User management
investigation.ts      // Investigation operations
evidence.ts           // Evidence handling
trustRisk.ts          // Trust & risk scoring
provenance.ts         // Provenance tracking
WargameResolver.ts    // Crisis simulation
```

### Middleware Stack
```typescript
auth.ts               // JWT validation
audit-logger.ts       // Request/response logging
rbac.ts               // Role-based authorization
cors.ts               // Cross-origin handling
helmet.ts             // Security headers
rate-limit.ts         // Rate limiting
validation.ts         // Input validation
```

---

## 8. Database Schemas

### Neo4j Graph Database
**Purpose**: Relationship discovery, graph analytics

**Key Node Types**:
- `Entity` (person, organization, location, asset)
- `Evidence` (document, communication, signal)
- `Investigation` (case container)
- `User` (investigators)

**Relationships**:
- `RELATED_TO` (generic entity relationship)
- `PART_OF` (hierarchical)
- `MENTIONS` (evidence → entity)
- `LINKED_BY` (evidence reference)

**Indexes**:
- Full-text: `evidenceContentSearch`
- Properties: Entity type, timestamp

### PostgreSQL Relational Database
**Purpose**: ACID transactions, structured data

**Core Tables**:
- `users` - User accounts
- `investigations` - Case metadata
- `entities` - Entity records
- `relationships` - Relationship records
- `evidence` - Evidence documents
- `audit_logs` - Activity tracking
- `notifications` - User notifications

**Prisma Migrations**: Managed via `db:migrate` commands

### Redis Cache
**Purpose**: Session storage, real-time data, job queue

**Usage**:
- User sessions (JWT blacklist)
- Real-time collaboration state
- BullMQ job queue
- Rate limiting counters
- Cached query results

---

## 9. Key Architectural Patterns

### 1. **Golden Path Workflow** (Core User Journey)
```
Investigation → Entities → Relationships → Copilot → Results
```
Every PR/deployment must maintain this working end-to-end.

### 2. **Deployable-First Philosophy**
- `make bootstrap` installs all dependencies
- `make up` starts full environment
- `make smoke` validates golden path
- **Zero tolerance**: Broken builds block merges

### 3. **Multi-Database Strategy**
- **Neo4j**: Graph analytics, relationship discovery
- **PostgreSQL**: Transactional data, audit logs
- **Redis**: Caching, real-time state, job queue

### 4. **AI/ML Integration**
- **ExtractionEngine**: Entity/relationship extraction from text & media
- **NLP Services**: Sentiment analysis, entity linking
- **Adversary Agents**: Threat modeling & simulation
- **BullMQ Workers**: Background job processing

### 5. **Security Layers**
- JWT authentication (access + refresh tokens)
- RBAC middleware (role-based access control)
- Audit logging (all mutations)
- Persisted GraphQL queries (production safety)
- Helmet.js security headers
- Rate limiting (600 req/min default)

### 6. **Real-Time Collaboration**
- Socket.io presence tracking
- GraphQL subscriptions for entity updates
- Event-driven architecture (investigation changes)

### 7. **Observability**
- OpenTelemetry instrumentation
- Prometheus metrics (system, business)
- Grafana dashboards (pre-provisioned)
- Structured logging (Pino)
- Jaeger tracing (optional)

---

## 10. Important Files for Documentation Development

### Critical for Understanding API Design
1. **`/server/src/app.ts`** - Express/Apollo setup, middleware order
2. **`/server/src/graphql/schema.ts`** - Complete GraphQL type definitions
3. **`/server/src/graphql/resolvers/index.ts`** - Resolver composition
4. **`/server/src/routes/*.ts`** - REST endpoint implementations

### For API Documentation
- All GraphQL resolvers in `/server/src/graphql/resolvers/`
- REST routes in `/server/src/routes/` (look for router setup & endpoint definitions)
- Type definitions in `/server/src/graphql/types/` and resolver imports

### For Understanding Workflows
- `/docs/ONBOARDING.md` - Core philosophy
- `/scripts/smoke-test.js` - Golden path validation
- `/docker-compose.dev.yml` - Service orchestration

---

## 11. Recommended Documentation Structure

Based on the codebase analysis, here's what documentation would be most valuable:

### Priority 1 (Highest Value)
```
Documentation Hub/
├── API Reference
│   ├── GraphQL API Guide
│   │   ├── Query Operations (entities, relationships, investigations)
│   │   ├── Mutations (create, update, delete)
│   │   ├── Subscriptions (real-time updates)
│   │   └── Persisted Queries (security model)
│   └── REST API Guide
│       ├── Health & Monitoring
│       ├── AI Operations
│       ├── Data Management
│       └── Webhooks
├── Architecture
│   ├── System Overview (C4 diagrams)
│   ├── Data Flow (entities → relationships → copilot)
│   ├── Database Design (Neo4j + PostgreSQL + Redis)
│   └── Security Model (JWT, RBAC, audit)
├── Developer Guide
│   ├── Local Development Setup
│   ├── Testing Strategy
│   ├── Code Organization
│   └── Contributing Guidelines
└── Deployment Guide
    ├── Docker Setup
    ├── Kubernetes Manifests
    ├── Environment Configuration
    └── Observability Setup
```

### Priority 2 (Supporting)
- Golden Path Walkthrough (investigation creation → results)
- Service Integration Guide (GitHub, n8n, Shopify, etc.)
- AI/ML Capabilities Overview
- Database Schema Reference

---

## 12. Quick Reference: Key Commands

```bash
# Development
make bootstrap          # Install deps, create .env, DB migrations
make up                # Start all services (Docker Compose)
make down              # Stop all services
make seed              # Load demo data
make smoke             # Run golden path validation

# Testing
pnpm test             # Run all unit tests
pnpm test:jest        # Jest unit tests
make smoke:ci          # CI-mode smoke test
pnpm e2e              # Playwright E2E tests

# Building & Linting
pnpm build            # Build all packages
pnpm lint             # ESLint + format check
pnpm typecheck        # TypeScript compilation check
pnpm format           # Auto-format code

# GraphQL
pnpm graphql:codegen  # Generate TypeScript types from schema
pnpm persisted:build  # Generate persisted query map

# Database
npm run db:migrate    # Apply Prisma migrations
npm run db:seed       # Seed demo data
npm run db:reset      # Migrate + seed
```

---

## Summary

Summit is a **production-ready, AI-powered intelligence analysis platform** with:

✅ **Full-stack architecture** (React + Node.js + GraphQL)  
✅ **Multi-database** (Neo4j + PostgreSQL + Redis)  
✅ **GraphQL + REST APIs** with 40+ endpoints  
✅ **Real-time collaboration** (Socket.io, subscriptions)  
✅ **Enterprise security** (JWT, RBAC, audit logging)  
✅ **AI/ML integrated** (extraction, NLP, adversary agents)  
✅ **Deployable-first** (make bootstrap && make up && make smoke)  
✅ **Comprehensive observability** (OpenTelemetry, Prometheus, Grafana)  
✅ **Well-documented** (README, ONBOARDING, architectural docs)  

**For documentation work, focus on**:
1. **API Reference** - Complete GraphQL & REST endpoint mapping
2. **Architecture Guides** - Data flow, security, deployment
3. **Developer Onboarding** - Local setup, testing, contribution workflow

