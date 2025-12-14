# Developer Onboarding Guide

Welcome to the **Summit / IntelGraph / Maestro** platform. This guide will get you set up quickly.

## 🚀 Quickstart

The fastest way to get started is using the `make` commands defined in the root `Makefile`.

### Prerequisites

- **Node.js**: v20+
- **pnpm**: v9+
- **Docker**: Desktop or Engine (Compose v2)
- **Python**: 3.11+ (for AI/ML components)

### 1. Bootstrap the Environment

Run a single bootstrap to install and scaffold everything:

```bash
make dev-setup
```

What it does (no extra steps needed): installs Node dependencies, sets up Python venvs, and copies `.env` templates.

### 2. Start Services

Spin up the local development stack:

```bash
make dev-run
```

You will get the server on port 4000, client on 5173, and data services via Docker Compose.

### 3. Verify Setup

Run the smoke tests to ensure everything is working:

```bash
make dev-test
```

If you are trialing the AI refactor tooling, you can also dry-run prompts without writing changes:

```bash
pnpm ts-node scripts/ai/run-refactor.ts --dry-run
```

## 🤖 Agent Roles

We utilize a multi-agent development workflow. Each agent has a specific role and scope.

See [Agent Roles Registry](./agent-roles.yaml) for a detailed list of roles and responsibilities.

### Common Roles:

- **Model Trainer**: AI/ML stack and training.
- **Graph/Backend Engineer**: Schema and core backend services.
- **Maestro Orchestrator Engineer**: Pipeline orchestration.
- **CI Guardian**: CI/CD health and policies.
- **UI/UX Engineer**: Frontend development.
- **Docs & Prompt Architect**: Documentation and agent coordination.

## 📂 Project Structure

- `server/`: Backend application (Express, GraphQL, Neo4j)
- `client/`: Frontend application (React, Vite)
- `apps/`: Other applications (e.g., `web`, `slo-exporter`)
- `docs/`: Project documentation
- `scripts/`: Utility scripts

## 📚 Resources

- [AGENTS.md](../../AGENTS.md): Comprehensive agent guidelines.
- [Makefile](../../Makefile): Development commands.
- [SPRINT_INDEX.md](../../SPRINT_INDEX.md): Sprint planning and status.
