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

## ⚡️ Start in 10 Minutes

### Prerequisites
- Node.js 18+ (via `pnpm`)
- Docker & Docker Compose

### 1. Launch Foundation
```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
pnpm install
docker-compose up -d
pnpm db:migrate
```

### 2. Connect Data
Navigate to `http://localhost:3000/data/sources` and enable the **RSS Connector** to start ingesting public OSINT feeds.

### 3. Run Your First Agent
Open the **Command Center** at `http://localhost:3000/dashboards/command-center` and ask:
> "Analyze recent crypto-mining activity in Eastern Europe based on the ingested feeds."

## 📚 Documentation by Tier

Summit is structured into three capability tiers:

| Tier | Focus | Documentation |
| :--- | :--- | :--- |
| **Foundation** | Data Ingestion, Knowledge Graph, API | [docs/FOUNDATION.md](docs/FOUNDATION.md) |
| **Agents** | Orchestration, Cognitive Skills, Workflow | [docs/AGENTS.md](docs/AGENTS.md) |
| **Enterprise** | Sovereignty, Governance, Audit, RBAC | [docs/ENTERPRISE.md](docs/ENTERPRISE.md) |

## 🚀 Deployment

- **On-Premises / Air-Gapped**: See [deploy/onprem](deploy/onprem/README.md)
- **VPC / Private Cloud**: See [deploy/vpc](deploy/vpc/README.md)
- **Security & Sovereignty**: See [docs/SECURITY_AND_SOVEREIGNTY.md](docs/SECURITY_AND_SOVEREIGNTY.md)

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

## 🤝 Contributing

We welcome contributions! Please see:

- [Contributing Guidelines](CONTRIBUTING.md)
- [Agent Contributing Guidelines](AGENT_CONTRIBUTING.md)
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
