# Summit

> **AI-Powered Intelligence Analysis Platform** - Graph analytics, vector search, and agentic workflows for high-stakes operations.

[![CI (Lint & Unit)](https://github.com/BrianCLong/summit/actions/workflows/ci-lint-and-unit.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/ci-lint-and-unit.yml)
[![CI (Golden Path)](https://github.com/BrianCLong/summit/actions/workflows/ci-golden-path.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/ci-golden-path.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/security.yml)

## 🚀 Overview

Summit is an intelligence platform designed to fuse open-source intelligence (OSINT) with internal data. It combines:

1.  **Graph Database (Neo4j)**: For modeling complex relationships between entities (People, Organizations, Events).
2.  **Vector Search (PostgreSQL + pgvector)**: For semantic retrieval of documents and unstructured text.
3.  **AI Copilot**: For automated extraction, summarization, and hypothesis generation.
4.  **Narrative Simulation**: For modeling event chains and "what-if" scenarios.

**Core Philosophy: Provable Truth.** Every AI insight is linked to source evidence. No "black box" conclusions.

---

## ✨ Key Capabilities

### 1. Unified Intelligence Graph
- **Entity Resolution**: Automatically link distinct records (e.g., "J. Doe" and "John Doe") based on shared properties.
- **Visual Explorer**: Interactive React-based graph exploration.
- **Temporal Analysis**: Filter and replay events over time.

### 2. AI-Augmented Analysis
- **Copilot**: Natural language interface to query the graph ("Find all connections to Corp X").
- **Extraction Pipelines**: Multimodal ingestion (Text, Image, Audio) with automated entity recognition (NER).
- **Source Tracking**: All extractions retain lineage to the original document.

### 3. Simulation & Governance
- **Narrative Engine**: Deterministic event simulation for forecasting.
- **Policy-as-Code**: OPA (Open Policy Agent) integration to enforce data access rules at the query level.
- **Audit Logging**: Immutable logs for every search, view, and modification.

---

## 🛠 Developer Quickstart

**Prerequisites:** Docker Desktop, Node.js 18+, pnpm.

### The "Golden Path" (Recommended)
This command bootstraps the entire stack (Postgres, Neo4j, Redis), runs migrations, seeds demo data, and verifies system health.

```bash
# 1. Setup & Start
make bootstrap
make up

# 2. Verify Health
make smoke
```

- **Frontend**: http://localhost:3000
- **GraphQL API**: http://localhost:4000/graphql
- **Neo4j Browser**: http://localhost:7474 (User: `neo4j`, Pass: `devpassword`)

### CLI Tools
Use `npm run summitctl` for common tasks.

---

## ✅ CI & Testing Standards

We enforce strict quality gates. All PRs must pass:

1.  **Lint & Unit**: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
2.  **Golden Path**: Full stack integration test (`make smoke`).
3.  **Security**: Vulnerability scanning (Trivy, CodeQL).

---

## 📚 Documentation

- **[Developer Onboarding](docs/ONBOARDING.md)**: Setup guide for contributors.
- **[API Reference](docs/api/README.md)**: GraphQL and REST endpoints.
- **[Deployment Guide](docs/deployment/README.md)**: Helm charts and production config.

---

## 🔒 Security & Compliance

- **Authentication**: JWT-based stateless auth with refresh rotation.
- **Authorization**: RBAC + ABAC backed by OPA.
- **Data Protection**: PII redaction and encrypted backups.

---

## 📄 License

**Proprietary / Enterprise License**.
See [LICENSE](./LICENSE) for terms. Community Edition components may be available under MIT where noted.
