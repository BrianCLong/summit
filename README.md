# Summit Platform

[![Copilot Playbook](https://img.shields.io/badge/Copilot-Playbook-blue)](docs/Copilot-Playbook.md)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/BrianCLong/summit?utm_source=oss&utm_medium=github&utm_campaign=BrianCLong%2Fsummit&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
[![CI](https://github.com/BrianCLong/summit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/ci.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/security.yml)
[![Release](https://github.com/BrianCLong/summit/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/release.yml)

> **Deployable-First IntelGraph Stack.**
> Combining GraphQL, React, Neo4j, PostgreSQL, Redis, and multimodal AI services for next-generation intelligence analysis.

---

## 🚀 Quickstart: The Golden Path

**Prerequisites:** Docker Desktop ≥ 4.x, Node 18+, pnpm 9, Python 3.11+.

We enforce a strict **Golden Path** for development: **Investigation → Entities → Relationships → Copilot → Results**. If `make smoke` passes, the core platform is healthy.

### 1. Bootstrap & Run
```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
./start.sh
```
*`./start.sh` installs dependencies, starts the Docker stack, and runs the smoke test suite.*

### 2. Verify Services
*   **Frontend:** [http://localhost:3000](http://localhost:3000)
*   **GraphQL API:** [http://localhost:4000/graphql](http://localhost:4000/graphql)
*   **Neo4j Browser:** [http://localhost:7474](http://localhost:7474) (User: `neo4j`, Pass: `devpassword`)
*   **Grafana:** [http://localhost:3001](http://localhost:3001)

### 3. Validate (Manual)
1.  Navigate to the **Frontend**.
2.  Click **"New Investigation"**.
3.  Add two entities (e.g., Person, Organization) and link them.
4.  Run a **Copilot Goal**.
5.  *Success:* Insights appear in < 5 seconds.

---

## 🏗 System Architecture

Summit is a precision-engineered monorepo designed for scale, security, and observability.

### Core Stack
*   **Frontend:** React 18, Material-UI, Redux Toolkit, Cytoscape.js (Graph Viz).
*   **Backend:** Node.js 20+, Express, Apollo Server v4 (GraphQL).
*   **Data Layer:**
    *   **Neo4j 5:** Graph relationships and centrality algorithms.
    *   **PostgreSQL 16:** Relational metadata, audit logs, and vector storage (pgvector).
    *   **TimescaleDB:** Time-series metrics and event tracking.
    *   **Redis 7:** Caching, session management, and rate limiting.
*   **AI/ML:** Multimodal extraction (OCR, CV, NLP) and LLM orchestration.

### Data Flow
1.  **Ingest:** Data enters via API, CSV, or Federation.
2.  **Process:** Text extracted, entities recognized (NER), embeddings generated.
3.  **Graph:** Entities resolved and linked in Neo4j.
4.  **Store:** Metadata and audit trails persisted to Postgres.
5.  **Serve:** GraphQL API delivers data with field-level security.
6.  **Visualize:** React frontend renders interactive networks and timelines.

---

## ✨ Capabilities

### 1. Graph Intelligence
*   **Semantic Search:** Hybrid search across vector embeddings and graph properties.
*   **Network Analysis:** Real-time community detection and pathfinding.
*   **Temporal Tracking:** Investigation timelines and event sequencing.

### 2. AI & Copilot
*   **Goal-Driven Orchestration:** Users define an objective; Copilot executes queries.
*   **Multimodal Extraction:** Text from images (OCR), object detection (YOLO), and audio transcription (Whisper).
*   **Narrative Simulation:** A tick-based engine (`/api/narrative-sim`) that models information propagation and sentiment shifts using hybrid rule-based/LLM logic.

### 3. Enterprise Grade
*   **Security:** Zero Trust architecture, RBAC, OPA policies, and PII scrubbing.
*   **Observability:** Full OpenTelemetry instrumentation, Prometheus metrics, and structured logging.
*   **Compliance:** Audit logging, versioning, and rigorous CI/CD gates.

---

## 🛠 Development Ecosystem

### Key Commands
| Command | Description |
| :--- | :--- |
| `make bootstrap` | Install all dependencies and setup environment. |
| `make up` | Start core services (Docker). |
| `make smoke` | Run the Golden Path E2E verification. |
| `pnpm test` | Run full test suite (Unit + Integration). |
| `pnpm lint` | Enforce code quality standards. |

*See [docs/COMMAND_REFERENCE.md](docs/COMMAND_REFERENCE.md) for the full operational catalog.*

### Documentation Index
*   **[Developer Onboarding](docs/ONBOARDING.md):** Day-one guide.
*   **[Contributing Guide](CONTRIBUTING.md):** Standards for humans and agents.
*   **[API Reference](docs/api/README.md):** GraphQL and REST endpoints.
*   **[Style Guide](docs/STYLE_GUIDE.md):** Editorial and coding standards.

---

## 🤝 Contributing

We welcome contributions that adhere to our **[Style Guide](docs/STYLE_GUIDE.md)** and **Definition of Done**.

1.  **Fork & Branch:** Use `feat/`, `fix/`, or `docs/` prefixes.
2.  **Test:** Ensure `make smoke` passes locally.
3.  **PR:** Write a narrative description of your change.

**For AI Agents:** See [`CLAUDE.md`](CLAUDE.md) for architectural context and operational protocols.

---

**Summit Platform** • *Intelligence, Engineered.*
