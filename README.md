# 🏔 Summit - Agentic AI OSINT Platform

> Open-source intelligence gathering powered by agentic AI, knowledge graphs, and real-time data ingestion.

[![Build Status](https://github.com/BrianCLong/summit/workflows/CI/badge.svg)](https://github.com/BrianCLong/summit/actions)
[![Coverage](https://img.shields.io/codecov/c/github/BrianCLong/summit)](https://codecov.io/gh/BrianCLong/summit)
[![License](https://img.shields.io/github/license/BrianCLong/summit)](LICENSE)

## ✨ Features

- **🤖 Agentic AI**: Multi-agent orchestration for autonomous research
- **🕸 Knowledge Graphs**: Neo4j + GraphRAG for connected intelligence
- **📡 Real-time Ingest**: Streaming connectors for CSV, S3, REST APIs
- **🔍 Vector Search**: Semantic retrieval with embeddings
- **📈 CompanyOS SDK**: Enterprise intelligence APIs
- **🔒 Security Hardened**: Production-ready CORS, Helmet, observability

## 🚀 Quickstart (Fixed — Feb 2026)

### Prerequisites

- Node.js 18+
- Docker + Docker Compose (v2)
- pnpm via Corepack (recommended)

Enable pnpm via Corepack:
```bash
corepack enable
```

### 1) Clone & Clean

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
pnpm run cleanup          # removes .archive, .disabled, .quarantine bloat (if present)
pnpm run setup            # bootstrap + permissions
```

### 2) Environment (first time only)

```bash
cp .env.example .env
# Edit .env and replace ALL placeholder secrets (minimum 32 chars for JWT/session secrets).
```

### 3) Install (pnpm everywhere)

```bash
pnpm install
```

### 4) Start the full local dev stack (recommended)

This repo’s complete dev stack (datastores + observability) is defined in `docker-compose.dev.yml`.

```bash
pnpm run docker:dev
# (Equivalent) docker compose -f docker-compose.dev.yml up -d
```

> Note: `docker-compose.yml` uses an **external** Docker network named `intelgraph`.
> If you run that file directly, you must create the network first:
>
> ```bash
> docker network create intelgraph 2>/dev/null || true
> ```

### 5) Database migrate + seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 6) Start dev servers

```bash
pnpm dev
```

* API: `http://localhost:4000/graphql`
* Web UI: `http://localhost:3000`

### Health check

```bash
curl -X POST http://localhost:4000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health { status version } }"}'
```

## 🏛 Architecture

Summit follows a modular microservices architecture:

```
┌──────────────────────────────────┐
│ 👥 User Agents (Jules, Codex)   │
└──────────┬───────────────────────┘
           │
           v
┌──────────┬────────────────────────┐
│ API Layer │ GraphQL + REST APIs    │
└──────────┬────────────────────────┘
           │
   ┌───────┼────────┐
   │       │        │
   v       v        v
┌────────┐ ┌────────┐ ┌────────┐
│ Ingest │ │GraphRAG│ │ Agents │
│ Engine │ │Pipeline│ │ Orchest│
└────┬───┘ └───┬────┘ └───┬────┘
     │         │          │
     v         v          v
┌─────────────────────────────────┐
│ 📊 Data Layer                   │
│ Neo4j | Postgres | Redis | Qdrant│
└─────────────────────────────────┘
```

## 🧩 Core Components

- **IntelGraph**: Central graph data model for entities, relationships, evidence, and provenance to enable link analysis and multi-hop queries.
- **Maestro Conductor**: Workflow orchestration for job DAGs, retries, policy enforcement, observability, and SLO tracking, driven by IntelGraph state.
- **CompanyOS**: Knowledge, runbooks, and business logic APIs integrated with graph data and orchestrated workflows.
- **Switchboard**: Ingestion, normalization, deduplication, enrichment, and routing of events into the platform’s core services.
- **Provenance Ledger**: Evidence-first audit trail for explainable outputs, lineage, and compliance-ready reporting across the platform.

**Deep Dive Docs:**

- [📈 Executive Briefing (2026-01-31)](docs/executive/2026-01-31-summit-platform-briefing.md)
- [🏛 Architecture Overview](docs/architecture/README.md)
- [🔌 Data Ingestion](docs/architecture/ingestion.md)
- [🤖 Agent System](docs/architecture/agents.md)
- [🕸 Knowledge Graphs](docs/architecture/knowledge-graph.md)
- [🔒 Security](docs/security/README.md)

## 📚 Key Components

### Connectors

Ingest data from multiple sources:

- **REST APIs**: Poll external services
- **CSV/S3**: Batch file processing
- **Neo4j/Postgres**: Database replication
- **Webhooks**: Real-time event streaming

See: [Connector Documentation](docs/connectors/README.md)

### GraphRAG

Retrieval-augmented generation with knowledge graphs:

- Entity extraction & linking
- Multi-hop graph traversal
- Vector similarity search
- LLM-powered synthesis

See: [GraphRAG Guide](docs/graphrag/README.md)

### Agents

Autonomous AI agents for research and analysis:

- **Jules**: PR reviewer, code analyzer
- **Codex**: Task brief generator
- **Observer**: Telemetry and monitoring

See: [Agent Development](docs/agents/README.md)

## 📡 API Reference

- [GraphQL Schema](docs/api/graphql.md)
- [REST Endpoints](docs/api/rest.md)
- [CompanyOS SDK](docs/api/companyos.md)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

## 🛡 Security

Summit follows security best practices:

- Helmet.js for HTTP security headers
- CORS with explicit origin whitelisting
- Rate limiting and request validation
- SQL injection prevention
- Dependency scanning (Dependabot)

See: [Security Policy](SECURITY.md)

## 🚀 Deployment

```bash
# Build for production
pnpm build

# Docker deployment
docker-compose -f docker-compose.prod.yml up -d

# Kubernetes
kubectl apply -f k8s/
```

See: [Deployment Guide](docs/deployment/README.md)

## 🤝 Contributing

We welcome contributions! Please see:

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Development Setup](docs/development/setup.md)

## 📄 License

[MIT License](LICENSE)

## 👥 Team & Support

- **GitHub Issues**: [Report bugs](https://github.com/BrianCLong/summit/issues)
- **Discussions**: [Community forum](https://github.com/BrianCLong/summit/discussions)
- **Documentation**: [Full docs](docs/)

Built with ❤️ by [@BrianCLong](https://github.com/BrianCLong) and [contributors](https://github.com/BrianCLong/summit/graphs/contributors)
\n\n# Verified Governance (2026-02-10)
