# 🏔 Summit - Agentic AI OSINT Platform & Safety Infrastructure

> Open-source intelligence gathering powered by agentic AI, knowledge graphs, and real-time data ingestion.
>
> **Summit verifies, governs, simulates, and controls AI automation systems before they can cause real-world failures.**

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
- **🛡️ Autonomous Safety Infrastructure**: Full safety lifecycle for AI agents

## Why Summit Exists

Autonomous systems are rapidly being deployed across software infrastructure:

- AI agents
- workflow automation
- multi-agent pipelines
- autonomous orchestration systems

These systems can fail in ways traditional software rarely does:

- runaway automation loops
- cascading system failures
- silent data corruption
- governance violations
- infrastructure overload

Most platforms only focus on building automation.

**Summit focuses on making automation safe.**

## What Summit Does

Summit provides a full safety lifecycle for autonomous systems.

`Verify → Govern → Simulate → Control`

It ensures systems are safe:

- before deployment
- during deployment
- while running in production

## The Summit Safety Stack

Summit is built as five integrated safety layers.

- **Autonomous Systems Control Plane (ASCP)**: Runtime intervention + containment
- **Autonomous Systems Risk Simulation Lab (ARS-Lab)**: Catastrophic failure simulation
- **Autonomous Systems Governance & Compliance Engine (ASGCE)**: Governance + regulatory evidence
- **Agentic Automation Safety Framework (AASF)**: Operational safety verification
- **Automation Scale Analyzer**: Architecture readiness evaluation

Together they form safety infrastructure for autonomous systems.

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

### 🌟 Golden Path (Recommended)

For a deterministic and clean bring-up of the local development environment:

```bash
# Automates: make clean -> make bootstrap -> make up
./scripts/golden-path.sh
```

Or manually:

```bash
make clean      # Clean build artifacts and docker system
make bootstrap  # Install Python venv and Node dependencies
make up         # Start all services via Docker Compose
```

Refer to [Golden Path Troubleshooting](docs/dev/golden-path-troubleshooting.md) for common issues (like Docker rate limits).

### First Query

```bash
# GraphQL playground
curl -X POST http://localhost:4000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health { status version } }"}'

# Or use the web UI
open http://localhost:3000
```

## 🏛 Architecture Overview

```text
                         Control
                          ▲
                          │
                Risk Simulation
                          ▲
                          │
                   Governance
                          ▲
                          │
                 Safety Verification
                          ▲
                          │
                Architecture Analysis
                          ▲
                          │
                  Autonomous Systems
```

Detailed architecture documentation:

- [Summit Autonomous Safety Architecture](docs/architecture/summit-autonomous-safety-architecture.md)
- [Architecture Map](docs/architecture/summit-safety-architecture-map.md)

## Safety Lifecycle

Summit enforces a complete safety pipeline.

```text
Design
 ↓
Architecture Verification
 ↓
Operational Safety Validation
 ↓
Governance Enforcement
 ↓
Catastrophic Risk Simulation
 ↓
Runtime Monitoring & Control
```

Each step produces machine-verifiable evidence.

## Deterministic Safety Artifacts

All modules produce reproducible artifacts.

```text
artifacts/

automation-scale/
  architecture-score.json

aasf/
  safety-score.json

asgce/
  compliance-report.json

ars-lab/
  catastrophe-risk.json

ascp/
  control-decisions.json
```

These artifacts allow CI systems to enforce safety guarantees.

## CI Safety Gates

Summit integrates directly into CI pipelines.

- `automation-scale-check`
- `aasf-safety-check`
- `asgce-compliance-check`
- `ars-lab-risk-check`
- `ascp-runtime-check`

If a safety check fails: **deployment blocked**

## Threat Model

Summit is designed to mitigate failures such as:

- runaway agents
- cascading automation failures
- silent data corruption
- governance violations
- resource exhaustion
- shadow automation

See the full threat model: [Summit Threat Model](docs/security/summit-threat-model.md)

## Example Usage

Example workflow:

```bash
pnpm summit analyze
pnpm summit safety-check
pnpm summit governance-check
pnpm summit simulate-risk
pnpm summit runtime-monitor
```

This pipeline verifies that a system is safe to deploy and operate.

## Repository Structure

```text
packages/

automation-scale/
aasf/
asgce/
ars-lab/
ascp/

docs/

architecture/
security/

scripts/
tests/
```

## Who Summit Is For

Summit is useful for teams building:

- AI agents
- multi-agent systems
- workflow automation
- autonomous infrastructure
- AI orchestration platforms

It is especially valuable where failures could impact:

- infrastructure
- financial systems
- enterprise workflows
- regulatory compliance

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

We welcome contributions in several areas:

- agent safety verification
- risk simulation models
- governance policy engines
- runtime intervention systems
- safety benchmarking

Before contributing, please review:

- `docs/architecture/`
- `docs/security/`
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Development Setup](docs/development/setup.md)

## Design Principles

Summit follows five core safety principles.

| Principle | Meaning |
| --- | --- |
| Fail Predictably | detect failures early |
| Contain Failures | isolate damage |
| Prove Safety | machine-verifiable evidence |
| Enforce Governance | policy enforcement |
| Control Runtime | intervene when necessary |

## Project Status

Summit is currently in early development.

The architecture is designed to support:

- large-scale agent systems
- enterprise automation
- regulated AI deployments
- safety-critical infrastructure

## Long-Term Vision

Summit aims to become the safety layer for autonomous systems.

Just as Kubernetes became infrastructure for containerized software, Summit aims to become infrastructure for safe AI automation.

## 📄 License

[MIT License](LICENSE)

## 👥 Team & Support

- **GitHub Issues**: [Report bugs](https://github.com/BrianCLong/summit/issues)
- **Discussions**: [Community forum](https://github.com/BrianCLong/summit/discussions)
- **Documentation**: [Full docs](docs/)

Built with ❤️ by [@BrianCLong](https://github.com/BrianCLong) and [contributors](https://github.com/BrianCLong/summit/graphs/contributors)
