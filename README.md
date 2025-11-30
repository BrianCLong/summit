[![Copilot Playbook](https://img.shields.io/badge/Copilot-Playbook-blue)](docs/Copilot-Playbook.md)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/BrianCLong/summit?utm_source=oss&utm_medium=github&utm_campaign=BrianCLong%2Fsummit&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
[![CI](https://github.com/BrianCLong/summit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/ci.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/security.yml)
[![Release](https://github.com/BrianCLong/summit/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/release.yml)

# Summit Platform

> Deployable-first IntelGraph (Summit) stack with GraphQL, React, Neo4j, PostgreSQL, Redis, and observability/AI services.

## 🛠 Developer Onboarding (Deployable-First)

- **Golden path = `make bootstrap && make up && make smoke`**. Fresh clones must go green before you write code.
- `./start.sh [--ai]` wraps the golden path on laptops and CI. It fails fast if health probes do not respond.
- The golden workflow we must defend end to end: **Investigation → Entities → Relationships → Copilot → Results** using the seeded dataset in `data/golden-path/demo-investigation.json`.
- **New developers:** See [docs/ONBOARDING.md](docs/ONBOARDING.md) for your 30-minute quickstart guide.

## 🚀 Quickstart (< 60 Seconds)

**Prerequisites:** Docker Desktop ≥ 4.x (8GB memory, BuildKit enabled), Node 18+, pnpm 9 (via `corepack enable`), Python 3.11+, ports 3000, 4000, 5432, 6379, 7474, 7687, 8080 available.

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
./start.sh              # One-command bootstrap: installs deps, starts services, runs smoke test
```

**Alternative (manual steps):**
```bash
make bootstrap          # installs pnpm deps + venv + .env
make up                 # docker-compose.dev.yml + migrations (API, web, dbs, observability)
make smoke              # golden path automation against seeded data
```

**Service Endpoints:**
- **Frontend**: http://localhost:3000 (React Application)
- **GraphQL API**: http://localhost:4000/graphql (Apollo Playground)
- **Neo4j Browser**: http://localhost:7474 (Graph Database UI)
- **Adminer**: http://localhost:8080 (Database Admin)
- **Prometheus**: http://localhost:9090 (Metrics)
- **Grafana**: http://localhost:3001 (Observability Dashboards)

**Optional AI/Kafka stack:** `./start.sh --ai` or `make up-ai` loads `docker-compose.ai.yml`.

### Observability & Health

- Health probes ship at `/health`, `/health/detailed`, `/health/ready`, `/health/live`, `/metrics`. `make smoke` curls them before executing mutations.
- Prometheus scrapes `api:4000/metrics` using `observability/prometheus/prometheus-dev.yml`.
- Grafana auto-provisions the **Summit Golden Path** dashboard (`observability/grafana/provisioning/dashboards/summit-golden-path.json`) with Prometheus datasource credentials from `.env`. Panels cover GraphQL p95, health-check uptime, and the lightweight dev gateway stub exposed on port `4100`.
- Stack wait logic lives in `scripts/wait-for-stack.sh`; it blocks until API+DBs pass readiness probes.

### Workspace Layout & Docs

- `apps/` – entrypoint services (client, web, gateway, analytics engines, etc.).
- `packages/` and `services/` – shared libraries, workers, ingestion pipelines.
- `archive/` – gigabytes of historical evidence moved out of the hot path and excluded from CI caches.
- `docs/ONBOARDING.md` – day-one onboarding.
- `docs/README.md` – documentation index, policies, and archived plans.

### Production Secrets & Guardrails

- `.env.example` is **DEV-ONLY** and documents every credential. `.env.production.sample` contains empty placeholders for production charts and pipelines.
- The API refuses to boot when `NODE_ENV=production` if `JWT_SECRET`, `JWT_REFRESH_SECRET`, database passwords, or CORS allow-lists match known defaults or include `localhost/*`.
- CORS allow-listing, rate limiting, persisted queries, and metrics are enforced in production automatically.

### pnpm Workspace Commands

```bash
pnpm install          # installs all workspace deps with turbo cache metadata
pnpm build            # turbo build graph + caching
pnpm test             # unit/integration suites (Jest/Vitest focus)
pnpm lint             # ESLint + Ruff (for Python helpers)
pnpm typecheck        # tsconfig project references
pnpm smoke            # same as make smoke (Node-based E2E)
```

💡 **New to Summit?** Run `make help` for a quick command reference, or see [docs/COMMAND_REFERENCE.md](docs/COMMAND_REFERENCE.md) for the full guide.

## CI Status

The `ci.yml` workflow runs on every PR + main: cached `pnpm install`, `make bootstrap`, `make up` (headless), `make smoke`, lint, typecheck, Jest, Playwright/E2E (currently proxies to the smoke test), SBOM + Trivy scans, and Docker layer caching. `security.yml` runs CodeQL analysis, dependency review, and gitleaks on a nightly schedule + PRs touching lockfiles. `release.yml` gates semantic-release with the same caches and requires a green CI status before packaging artifacts. All three workflows back the badges above and are required checks for merge.

---

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT) [![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com) [![Node.js](https://img.shields.io/badge/Node.js-20+-brightgreen.svg)](https://nodejs.org) [![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org) [![GraphQL](https://img.shields.io/badge/GraphQL-API-E10098.svg)](https://graphql.org)

### Automations

[![Copilot Context Refresh](https://github.com/BrianCLong/summit/actions/workflows/copilot-refresh.yml/badge.svg)](.github/workflows/copilot-refresh.yml)
[![Weekly Copilot Adoption Report](https://github.com/BrianCLong/summit/actions/workflows/copilot-adoption-report.yml/badge.svg)](.github/workflows/copilot-adoption-report.yml)

**Production-Ready MVP** • AI-augmented intelligence analysis platform combining graph analytics, real-time collaboration, and enterprise security. Built for the intelligence community with deployability-first principles.

---

## 🎯 Intelligence Community Value Proposition

> **ODNI-Aligned • Edge-First • Mission-Ready**

### Key Performance Metrics

| Capability | Metric | Validation |
|------------|--------|------------|
| **Insight Acceleration** | 50% faster time-to-insight vs. legacy systems | Validated against IC baseline workflows |
| **Edge Deployment** | Sub-100ms latency at tactical edge | JWICS/SIPRNet compatible architecture |
| **AI Governance** | 85% automated policy validation | OPA-based with human-in-the-loop escalation |
| **Agent Fleet Control** | Real-time incident response | Automated containment with audit trail |

### RFI-Ready Differentiators

- **Edge-First Architecture**: Deploy at tactical edge with offline-capable sync; no cloud dependency for mission-critical operations
- **50% Faster Insights**: Graph-accelerated analysis with AI copilot reduces analyst time-to-decision from hours to minutes
- **Zero-Trust by Default**: RBAC + ABAC + OPA policy engine with warrant-aware data access controls
- **Explainable AI**: Full provenance tracking with human-readable justifications for all AI-generated insights
- **FedRAMP-Ready**: Compliant architecture with STIG checklists and eMASS evidence bundles included
- **Agent Fleet Governance**: Centralized control plane for AI agent fleets with automated incident response and kill-switch capabilities

### IC Alignment

Summit/IntelGraph is purpose-built for the intelligence community with:

- **ICD 503 Compliance**: Security controls aligned with Intelligence Community Directive 503
- **Cross-Domain Ready**: Architecture supports future CDSintegration for multi-enclave operations
- **Analyst-Centric UX**: Designed with input from IC analysts for real-world tradecraft workflows
- **Interoperability**: STIX/TAXII native support with extensible connector framework

---

## 🎯 Golden Path Demo (Seeded Dataset)

**Critical Path**: Investigation → Entities → Relationships → Copilot → Results

This 5-minute workflow validates the core platform functionality using the dataset in [`data/golden-path/demo-investigation.json`](data/golden-path/demo-investigation.json). `make smoke` and the `scripts/smoke-test.js` harness use the same payload so local runs match CI exactly.

1. **Open Frontend**: Navigate to http://localhost:3000
   - Verify: Login page loads, no console errors

2. **Create Investigation**: Click "New Investigation" from Dashboard
   - Verify: Investigation created with unique ID
   - Should take < 2 seconds

3. **Add Entities**: Use the graph explorer to add entities and relationships
   - Create at least 2 entities (e.g., Person, Organization)
   - Link them with a relationship (e.g., "works_for")
   - Verify: Graph visualizes correctly

4. **Run Copilot Analysis**: Execute AI-augmented insights from the dataset goal
   - Click "Run Copilot Goal" or similar action
   - Verify: Progress indicators show, results stream in real-time

5. **View Results**: Explore generated insights and recommendations
   - Verify: Insights appear in UI
   - Verify: Graph updates with new discovered relationships (if any)

**Success Criteria**: All steps complete without errors in < 5 minutes

**If any step fails**: Stop and fix before continuing development (Deployable-First Mantra). Re-run `make smoke` after your fix to ensure parity with CI.

## ✅ Validation Notes

Run these from a clean machine (or CI runner) to verify the golden path end-to-end. Capture the output in your PR description for traceability.

```bash
git clone https://github.com/BrianCLong/summit.git && cd summit
corepack enable && pnpm -v
pnpm install --frozen-lockfile

make bootstrap
make up
make smoke

curl -sf http://localhost:4000/health && echo OK
curl -sf http://localhost:4000/health/detailed | jq '.status'
curl -sf http://localhost:4000/metrics | head -n 20

make down
```

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [Real-Time Narrative Simulation Engine](#-real-time-narrative-simulation-engine)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Support](#-support)

**📚 Additional Documentation:**
- [Developer Onboarding Guide](docs/ONBOARDING.md) - 30-minute quickstart for new developers
- [AI Agent Collaboration Guide](CONTRIBUTING.md) - Guidelines for AI agent contributions
- [Documentation Index](docs/README.md) - Complete documentation reference
- [CLAUDE.md](CLAUDE.md) - Comprehensive AI assistant guide for the codebase

## ✨ Features

### 🎯 Core Platform (MVP-0 Complete)

- **🔐 Authentication & Security**: JWT + RBAC + OPA policies + rate limiting
- **📊 Graph Analytics**: Neo4j + PostgreSQL + TimescaleDB + Redis with performance optimizations
- **⚛️ React Frontend**: Material-UI + Redux + real-time updates + responsive design
- **🤖 AI Copilot System**: Goal-driven query orchestration with live progress streaming
- **🔍 Investigation Workflow**: End-to-end investigation management + versioning
- **📥 Data Ingestion**: CSV upload + STIX/TAXII support + external data federation

### 🚀 Advanced Capabilities (MVP-1 Complete)

- **🤖 AI/ML Extraction Engine**: Multimodal AI-powered entity extraction and analysis
- **🎯 Computer Vision**: Object detection, face recognition, OCR, scene analysis
- **🗣️ Speech Processing**: Speech-to-text, speaker diarization, audio analysis
- **📝 Natural Language Processing**: Entity recognition, sentiment analysis, topic modeling
- **🔍 Vector Search**: Semantic search across multimodal content with embeddings
- **📊 Cross-Modal Intelligence**: AI-powered content matching across different media types
- **📈 Observability**: OpenTelemetry + Prometheus + Grafana dashboards
- **⚡ Performance**: LOD rendering + graph clustering + viewport optimization
- **🛡️ Security Hardening**: Persisted queries + tenant isolation + audit logging
- **🔄 DevOps**: Docker + CI/CD + smoke testing + deployment automation
- **🧠 Real-Time Narrative Simulation Engine**: Tick-based narrative propagation with rule-based + LLM generation and event injection APIs

### 🎮 User Interface Features

- **Interactive Graph Visualization**: Cytoscape.js with multiple layout algorithms
- **Real-time Collaboration**: Multi-user editing with presence indicators
- **AI-Powered Insights**: Natural language query processing
- **Mobile-Responsive Design**: Optimized for tablets and mobile devices
- **Accessibility**: WCAG 2.1 AA compliant interface

### 📊 Analytics & Intelligence

- **Graph Analytics**: Community detection, centrality analysis, path finding
- **🤖 AI/ML Extraction**: Real-time multimodal entity extraction and analysis
- **🔍 Computer Vision**: YOLO object detection, MTCNN face recognition, Tesseract OCR
- **🗣️ Speech Intelligence**: Whisper speech-to-text, speaker diarization, audio analysis
- **📝 Text Analytics**: spaCy NER, sentiment analysis, topic modeling, language detection
- **🧠 Vector Embeddings**: Sentence transformers for semantic search and similarity
- **🔗 Cross-Modal Matching**: AI-powered content correlation across media types
- **🎯 Smart Clustering**: Automatic entity grouping and relationship inference
- **⏱️ Temporal Analysis**: Time-series investigation and pattern recognition
- **🌍 GEOINT Support**: Geographic analysis with Leaflet integration
- **📊 Quality Scoring**: AI confidence metrics and validation workflows

## 🧠 Real-Time Narrative Simulation Engine

The simulation engine keeps evolving story arcs in lockstep with injected events, streaming data, and policy interventions. It runs alongside the Summit API server and exposes REST controls under `/api/narrative-sim`.

### Capabilities

- **Dual Narrative Generators** – Hybrid rule-based heuristics and pluggable LLM adapters (ships with an echo adapter for offline environments).
- **Entity, Event, and Parameter Modeling** – Actors, groups, and network relationships influence sentiment, momentum, and time-varying parameters such as trust or reach.
- **Real-Time Tick Loop** – Deterministic tick advancement recomputes momentum, arc outlooks, and story summaries, enabling daily/hourly playback.
- **Operational Interventions** – Inject events or actor actions, adjust parameters on the fly, and observe ripple effects across related entities.
- **Scenario Library** – Ready-made crisis, election, and information operations scripts in `scenarios/narrative/` demonstrate multi-step responsiveness.

### REST API Surface

| Method   | Path                                         | Description                                                                       |
| -------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST`   | `/api/narrative-sim/simulations`             | Create a simulation (rule-based or LLM-driven) from entity/parameter definitions. |
| `GET`    | `/api/narrative-sim/simulations`             | List active simulations with tick metadata.                                       |
| `GET`    | `/api/narrative-sim/simulations/:id`         | Fetch the full narrative state (entities, arcs, parameters, recent events).       |
| `POST`   | `/api/narrative-sim/simulations/:id/events`  | Queue time-stepped events or parameter perturbations.                             |
| `POST`   | `/api/narrative-sim/simulations/:id/actions` | Inject actor actions that auto-expand into events.                                |
| `POST`   | `/api/narrative-sim/simulations/:id/tick`    | Advance the clock by one or more ticks and recalculate story arcs.                |
| `DELETE` | `/api/narrative-sim/simulations/:id`         | Tear down a running simulation.                                                   |

### Quickstart Example

```bash
# 1. Create a simulation using the crisis scenario
curl -sS -X POST http://localhost:4000/api/narrative-sim/simulations \
  -H 'Content-Type: application/json' \
  --data @scenarios/narrative/crisis-response.json | jq '.id' > /tmp/sim_id

# 2. Inject scripted events
jq -c '.events[]' scenarios/narrative/crisis-response.json | while read evt; do
  curl -sS -X POST "http://localhost:4000/api/narrative-sim/simulations/$(cat /tmp/sim_id)/events" \
    -H 'Content-Type: application/json' \
    --data "$evt" >/dev/null
done

# 3. Advance the simulation three ticks and fetch the current arc summaries
curl -sS -X POST "http://localhost:4000/api/narrative-sim/simulations/$(cat /tmp/sim_id)/tick" \
  -H 'Content-Type: application/json' --data '{"steps":3}' >/tmp/state.json

jq '.arcs[] | {theme, momentum, outlook}' /tmp/state.json
```

Run dedicated tests with:

```bash
cd server
npm test -- --config jest.config.ts narrative
```

This executes focused Jest suites for the engine core and REST endpoints while keeping broader CI runs unchanged.

## 🏗️ Architecture

### Technology Stack

#### Frontend

- **Framework**: React 18 with Hooks and Context API
- **State Management**: Redux Toolkit with RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Graph Visualization**: Cytoscape.js with extensions
- **Build Tool**: Vite with Hot Module Replacement
- **Testing**: Jest + React Testing Library + Playwright E2E

#### Backend

- **Runtime**: Node.js 20+ with TypeScript
- **API**: GraphQL with Apollo Server v4
- **Web Framework**: Express.js with security middleware
- **Authentication**: JWT with refresh token rotation
- **Real-time**: Socket.io for WebSocket connections

#### Databases

- **Graph Database**: Neo4j 5 Community Edition
- **Relational Database**: PostgreSQL 16 with pgvector
- **Time-series Database**: TimescaleDB 2
- **Cache/Session Store**: Redis 7 with persistence
- **File Storage**: Local filesystem with S3 compatibility

#### Infrastructure

- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Monitoring**: OpenTelemetry + Prometheus + Grafana
- **Reverse Proxy**: Nginx (production)
- **CI/CD**: GitHub Actions with automated testing

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  GraphQL API    │◄──►│    Neo4j DB     │
│                 │    │                 │    │                 │
│ • Investigation │    │ • Authentication│    │ • Graph Data    │
│ • Graph Viz     │    │ • CRUD Ops      │    │ • Relationships │
│ • Real-time UI  │    │ • Subscriptions │    │ • Analytics     │
│ • Material-UI   │    │ • Rate Limiting │    │ • Constraints   │
└─────────────────┘    └─────────────────┘    └─────────────────┘

                       ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                       │  PostgreSQL DB  │    │   TimescaleDB   │    │    Redis Cache  │
                       │                 │    │                 │    │                 │
                       │ • User Data     │    │ • Time-series   │    │ • Sessions      │
                       │ • Audit Logs    │    │ • Metrics       │    │ • Real-time     │
                       │ • Metadata      │    │                 │    │ • Rate Limiting │
                       │ • Vector Store  │    │                 │    │ • Pub/Sub       │
                       └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Client Request**: React app sends GraphQL queries/mutations
2. **Authentication**: JWT token validation and RBAC checks
3. **Rate Limiting**: Redis-based request throttling
4. **Business Logic**: Resolver functions process requests
5. **Database Operations**: Neo4j for graph data, PostgreSQL for metadata, TimescaleDB for time-series metrics
6. **Real-time Updates**: Socket.io broadcasts changes to connected clients
7. **Caching**: Redis caches frequent queries and session data

## 🛠️ Development

### Development Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. Start all services (recommended)
./start.sh

# 3. Alternative: Manual startup
docker-compose -f docker-compose.dev.yml up -d

# 4. Individual service development
npm run client:dev    # Frontend only (port 3000)
npm run server:dev    # Backend only (port 4000)
```

### 🤖 AI/ML Setup (Optional)

Summit includes a powerful multimodal AI extraction engine for enhanced intelligence analysis:

```bash
# Navigate to server directory
cd server

# Install AI dependencies and models (one-time setup)
./scripts/setup-ai-models.sh

# Test AI extraction engines
node scripts/test-ai-extraction.js

# Start with AI capabilities enabled
AI_ENABLE_GPU=true npm run dev
```

**AI Capabilities Include:**

- **OCR**: Text extraction from images and documents (Tesseract, PaddleOCR)
- **Object Detection**: YOLO v8 for identifying objects, people, vehicles
- **Face Recognition**: MTCNN + FaceNet for facial detection and recognition
- **Speech-to-Text**: OpenAI Whisper for audio transcription and analysis
- **NLP**: spaCy for entity recognition, sentiment analysis, topic modeling
- **Embeddings**: Sentence transformers for semantic search and similarity
- **Cross-Modal Search**: Find related content across different media types

**Requirements:**

- Python 3.8+ with pip
- 4GB+ RAM (8GB+ recommended with GPU)
- Optional: NVIDIA GPU with CUDA for faster processing

**Docker AI Setup:**

```bash
# Build and run with AI container
docker-compose -f docker-compose.ai.yml up -d

# Test AI services
docker exec summit-ai python /app/scripts/test-ai-extraction.py
```

### Available Scripts

```bash
# Development
npm run dev           # Start all services
npm run client:dev    # Frontend development server
npm run server:dev    # Backend development server

# Quality Assurance
npm run test         # Full test suite (Jest + Playwright)
npm run test:unit    # Unit tests only
npm run test:e2e     # End-to-end tests
npm run test:smoke   # Smoke tests for deployment validation
npm run lint         # ESLint code quality checks
npm run typecheck    # TypeScript type checking
npm run format       # Prettier code formatting

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset and reseed database

# AI/ML (server directory)
./scripts/setup-ai-models.sh      # Install AI models and dependencies
node scripts/test-ai-extraction.js # Test AI extraction engines
python src/ai/models/yolo_detection.py --help  # Test object detection
python src/ai/models/whisper_transcription.py --help  # Test speech-to-text

# Utilities
npm run health       # System health check
npm run cleanup      # Clean up containers and images
```

### Environment Configuration

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

**Key Environment Variables**:

```bash
# Development
NODE_ENV=development
DEBUG=summit:*

# Database URLs
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword

POSTGRES_HOST=localhost
POSTGRES_DB=summit_dev
POSTGRES_USER=summit
POSTGRES_PASSWORD=devpassword

TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DB=summit_timeseries
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=devpassword

REDIS_HOST=localhost
REDIS_PASSWORD=devpassword

# API Configuration
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
CORS_ORIGIN=http://localhost:3000

# AI/ML Configuration (optional)
AI_MODELS_PATH=src/ai/models
AI_PYTHON_PATH=venv/bin/python
AI_ENABLE_GPU=true
AI_MAX_CONCURRENT_JOBS=5

# OCR Configuration
OCR_DEFAULT_ENGINE=tesseract
OCR_CONFIDENCE_THRESHOLD=0.6

# Object Detection
OBJECT_DETECTION_MODEL=yolov8n.pt
OBJECT_DETECTION_CONFIDENCE=0.5

# Speech Recognition
SPEECH_MODEL=whisper-base
SPEECH_LANGUAGES=en,de,fr,es,auto

# Text Analysis
TEXT_ANALYSIS_MODEL=en_core_web_lg
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Client Configuration (in client/.env)
VITE_API_URL=http://localhost:4000/graphql
VITE_WS_URL=http://localhost:4000
```

### Database Setup

The platform uses four databases:

1. **Neo4j** (Graph Database)
   - URL: http://localhost:7474
   - Username: `neo4j`
   - Password: `devpassword`
   - Purpose: Entity relationships and graph analytics

2. **PostgreSQL** (Relational Database)
   - Host: localhost:5432
   - Database: `summit_dev`
   - Username: `summit`
   - Password: `devpassword`
   - Purpose: User data, audit logs, metadata

3. **TimescaleDB** (Time-series Database)
   - Host: localhost:5433
   - Database: `summit_timeseries`
   - Username: `timescale`
   - Password: `devpassword`
   - Purpose: Metrics and event storage

4. **Redis** (Cache & Sessions)
   - Host: localhost:6379
   - Password: `devpassword`
   - Purpose: Session storage, caching, real-time pub/sub

### Code Structure

```
summit/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page-level components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API and external services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS and theme files
│   ├── public/             # Static assets
│   └── tests/              # Frontend tests
├── server/                 # Node.js backend application
│   ├── src/
│   │   ├── graphql/        # GraphQL schema and resolvers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models
│   │   ├── middleware/     # Express middleware
│   │   ├── db/            # Database connections and migrations
│   │   └── utils/         # Utility functions
│   └── tests/             # Backend tests
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
├── monitoring/            # Grafana dashboards and configs
├── deploy/               # Deployment configurations
└── docker-compose.*.yml  # Docker Compose files
```

## 🚀 Production Deployment

### Docker Production Build

```bash
# Core services (minimal hardware)
make bootstrap && make up

# With AI capabilities
make up-ai

# With Kafka streaming
make up-kafka

# Full deployment (AI + Kafka)
make up-full

# Health verification
make smoke
curl http://localhost:4000/health
```

### Production Environment Variables

```bash
# Required security configuration
export JWT_SECRET="your-production-jwt-secret-at-least-32-chars"
export JWT_REFRESH_SECRET="your-production-refresh-secret-different-from-jwt"
export ALLOWED_ORIGINS="https://your-domain.com"
export CORS_ORIGIN="https://your-domain.com"

# Optional rate limiting (defaults shown)
export RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
export RATE_LIMIT_MAX=500           # requests per window

# Start with production security enabled
NODE_ENV=production make up
```

### Kubernetes Deployment (Helm)

```bash
# Install Summit with Helm
helm upgrade --install summit ./helm/summit \
  --namespace summit --create-namespace \
  --values helm/summit/values/prod.yaml

# Check deployment status
kubectl get pods -n summit

# Run health tests
helm test summit -n summit

# Access services via port-forward
kubectl -n summit port-forward svc/summit-server 4000:4000 &
npm run test:smoke
```

### Health Monitoring

**Health Check Endpoints**:

- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status
- `GET /metrics` - Prometheus metrics

**Monitoring Stack**:

- **Metrics**: Prometheus scrapes application metrics
- **Visualization**: Grafana dashboards for monitoring
- **Alerting**: AlertManager for critical notifications
- **Logging**: Structured JSON logging with correlation IDs

## 📖 API Documentation

### GraphQL Schema

Access the GraphQL Playground at http://localhost:4000/graphql for interactive API exploration.

**Core Types**:

```graphql
type Entity {
  id: ID!
  type: String!
  props: JSON
  createdAt: DateTime!
  updatedAt: DateTime
}

type Relationship {
  id: ID!
  from: ID!
  to: ID!
  type: String!
  props: JSON
  createdAt: DateTime!
}

type Investigation {
  id: ID!
  name: String!
  description: String
  entities: [Entity!]!
  relationships: [Relationship!]!
  createdAt: DateTime!
}
```

**Key Queries**:

```graphql
# Get all entities with filtering
query GetEntities($type: String, $limit: Int = 25) {
  entities(type: $type, limit: $limit) {
    id
    type
    props
  }
}

# Search entities semantically
query SemanticSearch($query: String!, $limit: Int = 10) {
  semanticSearch(query: $query, limit: $limit) {
    id
    type
    props
  }
}

# Get investigation details
query GetInvestigation($id: ID!) {
  investigation(id: $id) {
    id
    name
    description
    entities {
      id
      type
      props
    }
    relationships {
      id
      from
      to
      type
      props
    }
  }
}
```

**Key Mutations**:

```graphql
# Create new entity
mutation CreateEntity($input: EntityInput!) {
  createEntity(input: $input) {
    id
    type
    props
  }
}

# Create investigation
mutation CreateInvestigation($input: InvestigationInput!) {
  createInvestigation(input: $input) {
    id
    name
    description
  }
}
```

### REST Endpoints

```bash
# Health and monitoring
GET  /health                 # Basic health check
GET  /health/detailed        # Detailed system status
GET  /metrics               # Prometheus metrics

# File operations
POST /api/upload            # File upload
GET  /api/export/:format    # Data export (CSV, JSON, GraphML)

# Admin operations
GET  /admin/stats           # System statistics
POST /admin/migrate         # Run database migrations
```

### WebSocket Events

Real-time updates via Socket.io:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:4000');

// Listen for entity updates
socket.on('entity:created', (entity) => {
  console.log('New entity created:', entity);
});

socket.on('entity:updated', (entity) => {
  console.log('Entity updated:', entity);
});

// Join investigation room for real-time collaboration
socket.emit('join:investigation', { investigationId: '123' });
```

## 🔒 Security

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication with refresh token rotation
- **Role-Based Access Control (RBAC)**: Fine-grained permissions system
- **Open Policy Agent (OPA)**: Policy-based authorization
- **Rate Limiting**: Redis-based request throttling

### Security Features

- **Input Validation**: GraphQL schema validation + custom sanitization
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content Security Policy + input sanitization
- **CSRF Protection**: SameSite cookies + CSRF tokens
- **Secure Headers**: Helmet.js security middleware
- **Audit Logging**: Comprehensive activity logging

### Data Protection

- **Encryption at Rest**: Database encryption enabled
- **Encryption in Transit**: TLS 1.3 for all communications
- **Secret Management**: Environment-based configuration
- **Data Anonymization**: PII scrubbing in logs
- **Backup Encryption**: Encrypted database backups

### Compliance

- **GDPR Ready**: Data portability and deletion endpoints
- **SOC 2 Type II**: Security controls implementation
- **NIST Framework**: Cybersecurity framework alignment

## 🔧 Configuration

### Feature Flags

```bash
# Enable/disable features via environment variables
FEATURE_AI_SUGGESTIONS=true
FEATURE_REALTIME_COLLABORATION=true
FEATURE_ADVANCED_ANALYTICS=false
PERSISTED_QUERIES=1
```

### Performance Tuning

```bash
# Database connection pools
NEO4J_MAX_POOL_SIZE=50
POSTGRES_MAX_POOL_SIZE=20
REDIS_MAX_POOL_SIZE=10

# Cache configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# Rate limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # requests per window
```

### Logging Configuration

```bash
# Log levels: error, warn, info, debug, trace
LOG_LEVEL=info
LOG_FORMAT=json

# Log destinations
LOG_FILE=/app/logs/application.log
LOG_ELASTICSEARCH_URL=http://localhost:9200
```

## 🧪 Testing

### Test Categories

1. **Unit Tests**: Jest for individual component testing
2. **Integration Tests**: API endpoint and database integration
3. **E2E Tests**: Playwright for full user journey testing
4. **Performance Tests**: Load testing with Artillery
5. **Security Tests**: OWASP ZAP automated security scanning

### Running Tests

```bash
# All tests
npm test

# Specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance tests
npm run test:security     # Security tests

# Test coverage
npm run test:coverage     # Generate coverage report

# Watch mode for development
npm run test:watch        # Run tests in watch mode
```

### Test Data

```bash
# Seed test data
npm run db:seed:test

# Reset test database
npm run db:reset:test

# Load performance test data
npm run db:seed:performance
```

## 📊 Monitoring & Observability

### Metrics

**Application Metrics**:

- Request rate, latency, error rate
- Database query performance
- Cache hit/miss ratios
- Real-time connection counts

**Business Metrics**:

- Investigation creation rate
- Entity/relationship growth
- User engagement metrics
- AI/ML model performance

### Dashboards

Access Grafana dashboards at http://localhost:3100:

- **System Overview**: High-level system health
- **API Performance**: Request metrics and latency
- **Database Health**: Query performance and connections
- **User Activity**: Engagement and usage patterns

### Alerting

**Critical Alerts**:

- Service downtime
- Database connection failures
- High error rates (>5%)
- Memory usage >90%

**Warning Alerts**:

- Elevated response times
- Queue backlog buildup
- Low disk space

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Submit** a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages
- **Test Coverage**: Minimum 80% coverage required

### Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Ensure all CI checks pass
- Request review from core maintainers
- Squash commits before merging

## 📚 Additional Resources

### Documentation

- [API Reference](docs/api/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Troubleshooting Guide](docs/troubleshooting/README.md)
- [Archived Documents](docs/archive/README.md)

### Community

- [GitHub Discussions](https://github.com/BrianCLong/summit/discussions)
- [Issue Tracker](https://github.com/BrianCLong/summit/issues)
- [Release Notes](CHANGELOG.md)

### Learning Resources

- [GraphQL Best Practices](docs/graphql-guide.md)
- [React Development Guide](docs/react-guide.md)
- [Neo4j Query Patterns](docs/neo4j-guide.md)

## 📞 Support

### Getting Help

- **Documentation**: Check [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/BrianCLong/summit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BrianCLong/summit/discussions)
- **Email**: support@summit.com

### Reporting Bugs

Please include:

- Operating system and version
- Node.js and npm versions
- Docker version
- Steps to reproduce
- Expected vs actual behavior
- Relevant log files

### Feature Requests

Use the [Feature Request template](https://github.com/BrianCLong/summit/issues/new?template=feature_request.md) and include:

- Clear description of the feature
- Use case and business value
- Proposed implementation approach
- Alternative solutions considered

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the intelligence community
- Powered by [React](https://reactjs.org/), [Node.js](https://nodejs.org/), [GraphQL](https://graphql.org/), and [Neo4j](https://neo4j.com/)
- UI components from [Material-UI](https://mui.com/)
- Graph visualization with [Cytoscape.js](https://cytoscape.org/)

---

**Summit Platform** - Next-Generation Intelligence Analysis
