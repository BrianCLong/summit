# Summit - Sovereign Enterprise Agentic AI Platform

> A multi-agent, workflow-centric platform for governed enterprise AI with measurable ROI, auditability, and compliance by design.

[![Build Status](https://github.com/BrianCLong/summit/workflows/CI/badge.svg)](https://github.com/BrianCLong/summit/actions)
[![Coverage](https://img.shields.io/codecov/c/github/BrianCLong/summit)](https://codecov.io/gh/BrianCLong/summit)
[![License](https://img.shields.io/github/license/BrianCLong/summit)](LICENSE)

## Features

- **Multi-agent orchestration**: Supervisor and specialist agents with explicit governance boundaries.
- **Sovereign control plane**: Policy-first execution with evidence capture and audit trails.
- **Workflow-centric automation**: Human-in-the-loop approvals, escalation, and rollback gates.
- **Enterprise-grade security**: OIDC/OPA/RBAC, hardened CI gates, and compliance evidence.
- **Knowledge graph intelligence**: Neo4j + GraphRAG for entity, relationship, and provenance-aware retrieval.
- **Connector fabric**: Streaming and batch ingestion across APIs, files, and event buses.

## Jobs To Be Done

- **Close books faster**: Reconcile invoices, flag exceptions, and require approval for high-value payments.
- **Accelerate KYC onboarding**: Automate entity verification with auditable decisions and escalation gates.
- **Operationalize SOC runbooks**: Enforce response playbooks with immutable evidence capture.

## Quickstart

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

### First Query

```bash
# GraphQL playground
curl -X POST http://localhost:4000/api/graphql   -H "Content-Type: application/json"   -d '{"query": "{ health { status version } }"}'

# Or use the web UI
open http://localhost:3000
```

## Architecture At A Glance

```
+-----------------------------+        +-----------------------------+
| Governance & Policy Control |<------>| Observability & Evidence    |
+-----------------------------+        +-----------------------------+
                |                                 |
                v                                 v
+-----------------------------+        +-----------------------------+
| Agent Runtime & Orchestration|------>| Workflow Engine (Maestro)   |
+-----------------------------+        +-----------------------------+
                |                                 |
                v                                 v
+-----------------------------+        +-----------------------------+
| Connectors & Integrations   |------>| Data Layer (Graph + RDBMS)  |
+-----------------------------+        +-----------------------------+
```

## Core Components

- **IntelGraph**: Central graph model for entities, relationships, evidence, and provenance.
- **Maestro Conductor**: Orchestration for job DAGs, retries, policy enforcement, and SLO tracking.
- **CompanyOS**: Knowledge, runbooks, and business logic APIs integrated with graph data.
- **Switchboard**: Ingestion, normalization, deduplication, enrichment, and routing of events.
- **Provenance Ledger**: Evidence-first audit trail for explainable outputs and compliance reporting.

**Deep Dive Docs:**

- [Executive Briefing (2026-01-31)](docs/executive/2026-01-31-summit-platform-briefing.md)
- [Architecture Overview](docs/architecture/README.md)
- [Data Ingestion](docs/architecture/ingestion.md)
- [Agent System](docs/architecture/agents.md)
- [Knowledge Graphs](docs/architecture/knowledge-graph.md)
- [Security](docs/security/README.md)
- [CI Overview](docs/ci.md)

## Key Components

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

## API Reference

- [GraphQL Schema](docs/api/graphql.md)
- [REST Endpoints](docs/api/rest.md)
- [CompanyOS SDK](docs/api/companyos.md)

## Testing

```bash
# Run all tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

## Security

Summit follows security best practices and governance gates:

- Helmet.js for HTTP security headers
- CORS with explicit origin whitelisting
- Rate limiting and request validation
- Dependency scanning (Dependabot)
- Code scanning (CodeQL)

See: [Security Policy](SECURITY.md) and [Summit Readiness Assertion](docs/SUMMIT_READINESS_ASSERTION.md)

## Deployment

```bash
# Build for production
pnpm build

# Docker deployment
docker-compose -f docker-compose.prod.yml up -d

# Kubernetes
kubectl apply -f k8s/
```

See: [Deployment Guide](docs/deployment/README.md)

## Contributing

We welcome contributions. Please see:

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Development Setup](docs/development/setup.md)

## License

[MIT License](LICENSE)

## Team & Support

- **GitHub Issues**: [Report bugs](https://github.com/BrianCLong/summit/issues)
- **Discussions**: [Community forum](https://github.com/BrianCLong/summit/discussions)
- **Documentation**: [Full docs](docs/)

Built by [@BrianCLong](https://github.com/BrianCLong) and contributors.
