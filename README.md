# Summit / IntelGraph

[![Current Version](https://img.shields.io/badge/version-v2.0.0-blue.svg)](CHANGELOG-v2.0.0.md)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)](#)
[![CI (Golden Path)](https://github.com/BrianCLong/summit/actions/workflows/ci-golden-path.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/ci-golden-path.yml)
[![Security](https://github.com/BrianCLong/summit/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/BrianCLong/summit/actions/workflows/security.yml)
[![Copilot Playbook](https://img.shields.io/badge/Copilot-Playbook-blue)](docs/how-to/ai-agents.md)

**Summit** (Enterprise Edition: **IntelGraph**) is an AI-augmented intelligence analysis platform designed for the intelligence community. It combines high-performance graph analytics, real-time collaboration, and multimodal AI to accelerate mission-critical investigations.

---

## 🎉 NEW in v2.0.0: The Enterprise Integration Release

Summit v2.0.0 represents a generational leap, consolidating over 12,000 PRs into a hardened, enterprise-ready platform.

### 🏛️ Enterprise Infrastructure
*   **Intelligent Load Balancing**: Predictive routing with weighted-round-robin algorithms.
*   **Multi-Tier Caching**: L1 in-memory + L3 Redis coherence protocol, reducing API P95 latency to **<200ms**.
*   **Automated Deployments**: Canary release framework with automated rollbacks and hot-reloading configurations.
*   **Full Observability**: Integrated OpenTelemetry, Prometheus, and Jaeger tracing across all 150+ microservices.

### 🧠 Advanced AI/ML Capabilities
*   **Multimodal Extraction**: Complete engine featuring **8 "Black Projects"** modules for specialized intelligence.
*   **Computer Vision**: Real-time object detection (YOLOv8) and MTCNN face recognition.
*   **Speech & NLP**: Whisper-powered audio transcription and spaCy-driven entity/sentiment analysis.
*   **GraphRAG**: Hybrid semantic search using sentence transformers and Neo4j context.

### 🛡️ Security & Governance
*   **Zero Trust Architecture**: OPA-enforced ABAC policies with multi-tenant isolation (IDOR remediation).
*   **GraphQL Hardening**: Complexity and depth limiting with Persisted Queries (APQ).
*   **Data Spine**: Strict data contracts with embedded policy metadata and full lineage tracking.

### ⚡ Real-Time Narrative Intelligence
*   **EvoSim Engine**: Tick-based narrative simulation for "what-if" threat forecasting.
*   **Live Collaboration**: WebSocket-driven presence and instant graph updates for distributed teams.

---

## 🚀 Quick Start (The Golden Path)

**Prerequisites**: Docker Desktop (8GB+ RAM), Node.js 18+, pnpm 9.

### 1. Bootstrap & Run
We enforce a **Deployable-First** philosophy. The "Golden Path" must always be green.

```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Start the full stack (API, UI, DBs, AI Services)
./start.sh --ai
```

### 2. Verify system health
```bash
make smoke
```

*   **Web Client**: [http://localhost:3000](http://localhost:3000)
*   **GraphQL API**: [http://localhost:4000/graphql](http://localhost:4000/graphql)
*   **Observability**: [http://localhost:3001](http://localhost:3001)

---

## 📘 Documentation

Explore our comprehensive **[`docs/`](docs/)** directory for deep dives into every aspect of the platform.

*   **[User Guide](docs/get-started/user-guide.md)**: The Analyst's Handbook.
*   **[Architecture Overview](docs/concepts/architecture.md)**: System design and domain boundaries.
*   **[Data Model](docs/concepts/data-model.md)**: Entities, Relationships, and Provenance.
*   **[Service Catalog](docs/reference/service-catalog.md)**: Inventory of 150+ microservices.
*   **[Strategic Roadmap](docs/archive/future-roadmap.md)**: The "Infinite Horizon" plan.

---

## 🤝 Contributing

We welcome contributions! Please see **[CONTRIBUTING.md](CONTRIBUTING.md)** for our development standards, CI policy, and AI agent guidelines.

**Main Workflow**:
1.  Run `pnpm run ci` locally before pushing.
2.  All PRs must pass the **Golden Path** (`make smoke`) in CI.
3.  We use Conventional Commits.

---

## 📄 License

*   **Community Edition**: MIT License (See `OSS-MIT-LICENSE`).
*   **Enterprise Edition**: Commercial License (See `LICENSE`).

**Summit Platform** • Built for the Mission.