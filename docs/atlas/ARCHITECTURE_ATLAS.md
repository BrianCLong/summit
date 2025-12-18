# 🏗️ Architecture Atlas

This atlas maps the technical topology of the system, including directory structures, service layers, data flows, and infrastructure components.

## 🏙️ System Overview

The system is a **Monorepo** containing a multi-service "IntelGraph" platform, designed for high-assurance cognitive operations.

### High-Level Layers

1.  **Experience Layer (`apps/web`, `client/`)**
    -   **Summit Console:** React/Vite application for analysts.
    -   **Conductor UI:** Orchestration visualization.
    -   **Switchboard:** Real-time communications interface.

2.  **API & Gateway Layer (`server/`, `apps/gateway`)**
    -   **GraphQL API:** The primary interface for the frontend.
    -   **REST API:** For specific integrations and webhooks.
    -   **Auth Service:** JWT-based stateless authentication.

3.  **Intelligence Layer (`server/src/services/`)**
    -   **Maestro:** Workflow orchestration engine.
    -   **PsyOps Defense:** Narrative analysis and influence mapping.
    -   **Auto-Scientist:** Automated experiment orchestration.
    -   **Privacy & Compliance:** PII detection and DSAR handling.

4.  **Data Layer**
    -   **Neo4j:** The "IntelGraph" knowledge graph (Entities, Relationships).
    -   **PostgreSQL:** Relational data (Users, Auth, Provenance Ledger).
    -   **Redis:** Caching, Pub/Sub, and Job Queues (`bullmq`).
    -   **Elasticsearch:** Full-text search and indexing.

5.  **Infrastructure Layer**
    -   **Docker Compose:** Local development orchestration.
    -   **Kubernetes (Helm):** Production deployment.
    -   **OpenTelemetry:** Comprehensive observability pipeline.

---

## 📂 Directory Geography

### `apps/` (Applications)
Deployable units that form the user-facing or edge components.
- `apps/web`: Main React application.
- `apps/slo-exporter`: Prometheus metrics exporter for SLOs.

### `server/` (Backend Core)
The monolithic backend service (gradually splitting into microservices).
- `src/services/`: Business logic singletons.
- `src/routes/`: Express route handlers.
- `src/graphql/`: Apollo Server resolvers and schema.
- `src/db/`: Database connection managers.

### `packages/` (Shared Libraries)
Reusable code shared across apps and services.
- `packages/prov-ledger`: Provenance Ledger implementation.
- `packages/contracts`: Shared TypeScript interfaces and schemas.

### `services/` (Microservices)
Distinct backend services (often Python or specialized Node.js).
- `prov-ledger`: Python/FastAPI provenance service.
- `ingest`: Data ingestion workers.

### `prompts/` (Cognitive DNA)
The source code for the AI agents themselves (see **Prompt Atlas**).

---

## ⚡ Data Flow Arteries

### 1. The Ingestion Flow
`Source` -> `Connector` -> `Kafka/Redis` -> `Ingest Worker` -> `Neo4j/Postgres`

### 2. The Cognitive Flow
`User Query` -> `GraphQL` -> `Orchestrator` -> `LLM Service` -> `Context (Vector DB)` -> `Response`

### 3. The Provenance Flow
`Action` -> `Interceptor` -> `Provenance Ledger` -> `WORM Storage` -> `Audit Log`

---

## 🧱 Infrastructure Blocks

### Persistence
- **Primary Graph:** Neo4j 5.x
- **Primary Relational:** PostgreSQL 16
- **Cache/Queue:** Redis 7

### Observability
- **Metrics:** Prometheus + Grafana
- **Tracing:** OpenTelemetry (Jaeger/Tempo)
- **Logs:** Pino -> Loki/CloudWatch

### CI/CD Pipelines
- **CI:** GitHub Actions (Lint, Test, Security Scan).
- **Gates:** SLO checks, Policy (OPA) checks, Smoke tests.
- **Artifacts:** Docker images, SBOMs, Helm charts.
