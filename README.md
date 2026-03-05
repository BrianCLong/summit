# 🏔 Summit - Agentic AI OSINT Platform

> Open-source intelligence gathering powered by agentic AI, knowledge graphs, and real-time data ingestion.

[![CI](https://github.com/BrianCLong/summit/actions/workflows/ci.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/ci.yml)
[![Rust CI](https://github.com/BrianCLong/summit/actions/workflows/ci-rust.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/ci-rust.yml)
[![Python CI](https://github.com/BrianCLong/summit/actions/workflows/ci-python.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/ci-python.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/security.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/security.yml)
[![CodeQL](https://github.com/BrianCLong/summit/actions/workflows/codeql.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/codeql.yml)
[![OSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/BrianCLong/summit/badge)](https://securityscorecards.dev/viewer/?uri=github.com/BrianCLong/summit)
[![Coverage](https://img.shields.io/codecov/c/github/BrianCLong/summit)](https://codecov.io/gh/BrianCLong/summit)
[![License](https://img.shields.io/github/license/BrianCLong/summit)](LICENSE)

## ✨ Features

- **🤖 Agentic AI**: Multi-agent orchestration for autonomous research
- **🕸 Knowledge Graphs**: Neo4j + GraphRAG for connected intelligence
- **📡 Real-time Ingest**: Streaming connectors for CSV, S3, REST APIs
- **🔍 Vector Search**: Semantic retrieval with embeddings
- **📈 CompanyOS SDK**: Enterprise intelligence APIs
- **🔒 Security Hardened**: Production-ready CORS, Helmet, observability

## 🚀 Quickstart

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Neo4j 5.x (via Docker)

### Install & Run

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Install dependencies
pnpm install

# Start infrastructure (Neo4j, Postgres, Redis)
docker-compose up -d

# Run migrations
pnpm db:migrate

# Start dev server
pnpm dev
```

Server runs at `http://localhost:4000`

## 🎥 Onboarding Tutorials

Accelerate team onboarding with short, script-backed walkthroughs. Recordings can be captured with Loom for rapid sharing or OBS Studio when you need multi-scene production. Each video includes a narrator script, transcript for captioning, and a placeholder link to swap once the final recording is available.

- **Data Ingestion Wizard Onboarding** – [Script](docs/tutorials/data-ingestion-wizard-script.md) · [Transcript](docs/tutorials/data-ingestion-wizard-transcript.md) · [Recording placeholder](https://loom.com/share/TBD-data-ingestion-wizard)
- **Graph Querying Essentials** – [Script](docs/tutorials/graph-querying-script.md) · [Transcript](docs/tutorials/graph-querying-transcript.md) · [Recording placeholder](https://loom.com/share/TBD-graph-querying)
- **ML Integration Kickstart** – [Script](docs/tutorials/ml-integration-script.md) · [Transcript](docs/tutorials/ml-integration-transcript.md) · [Recording placeholder](https://loom.com/share/TBD-ml-integration)

### First Query

```bash
# GraphQL playground
curl -X POST http://localhost:4000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health { status version } }"}'

# Or use the web UI
open http://localhost:3000
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
