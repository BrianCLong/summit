# Summit / IntelGraph

[![CI (Golden Path)](https://github.com/BrianCLong/summit/actions/workflows/ci-golden-path.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/ci-golden-path.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/security.yml)
[![Release](https://github.com/BrianCLong/summit/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/release.yml)
[![Copilot Playbook](https://img.shields.io/badge/Copilot-Playbook-blue)](docs/how-to/ai-agents.md)

**Summit** (Enterprise Edition: **IntelGraph**) is an AI-augmented intelligence analysis platform designed for the intelligence community. It combines graph analytics, real-time collaboration, and multimodal AI to accelerate investigations.

> **Current Version**: v2.0.0 (Enterprise Integration Release)
> **Status**: Production Ready

---

## 🚀 Quick Start (The Golden Path)

**Prerequisites**: Docker Desktop, Node.js 18+, pnpm 9.

### 1. Bootstrap & Run

We enforce a **Deployable-First** philosophy. The "Golden Path" must always be green.

```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Start the full stack (API, UI, DBs, AI Services)
./start.sh
```

### 2. Verify

Once running, the stack exposes the following interfaces:

- **Web Client**: [http://localhost:3000](http://localhost:3000) (User Interface)
- **GraphQL API**: [http://localhost:4000/graphql](http://localhost:4000/graphql) (Playground)
- **Observability**: [http://localhost:3001](http://localhost:3001) (Grafana)

Run the end-to-end smoke test to verify system health:

```bash
make smoke
```

---

## 📘 Documentation

We have moved all authoritative documentation to the **[`docs/`](docs/)** directory.

### Getting Started

- **[Onboarding Guide](docs/get-started/index.md)**: Detailed setup instructions.
- **[User Guide](docs/get-started/user-guide.md)**: The Analyst's Handbook.

### Core Concepts

- **[Architecture Overview](docs/concepts/architecture.md)**: High-level system design.
- **[Data Model](docs/concepts/data-model.md)**: Entity, Relationship, and Provenance schema.
- **[Security Model](docs/concepts/security-model.md)**: AuthN/AuthZ, OPA, and RBAC.
- **[AI Architecture](docs/concepts/ai-architecture.md)**: Copilot, GraphRAG, and EvoSim.

### Operations & Reference

- **[Observability](docs/operations/observability.md)**: Monitoring & Alerting.
- **[Service Catalog](docs/reference/service-catalog.md)**: Inventory of 150+ microservices.
- **[CLI Reference](docs/reference/cli.md)**: `make` and `pnpm` commands.

---

## ✨ Key Features (v2.0.0)

### 🧠 AI-Augmented Analysis

- **Multimodal Copilot**: Ask natural language questions about your graph data.
- **GraphRAG**: LLM responses grounded in your private knowledge graph.
- **Narrative Simulation**: "What-if" threat modeling engine (EvoSim).

### 🛡️ Enterprise Security

- **Zero Trust**: OPA-enforced ABAC policies for every data access.
- **Audit Logging**: Immutable, append-only logs for all actions.
- **Governance**: Data Spine contracts for lineage and compliance.

### ⚡ Real-Time Collaboration

- **Live Graph**: See teammates' cursors and updates instantly.
- **Presence**: Activity indicators and collaborative workspaces.

---

## 🤝 Contributing

We welcome contributions! Please see **[CONTRIBUTING.md](CONTRIBUTING.md)** for our development standards, CI policy, and AI agent guidelines.

**Main Workflow**:

1.  Run `pnpm run ci` locally before pushing.
2.  All PRs must pass the **Golden Path** (`make smoke`) in CI.
3.  We use Conventional Commits.

---

## 📄 License

- **Community Edition**: MIT License (See `OSS-MIT-LICENSE`).
- **Enterprise Edition**: Commercial License (See `LICENSE`).

**Summit Platform** • Built for the Mission.
