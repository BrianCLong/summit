# Getting Started

Welcome to Summit! This guide covers the prerequisites, repository structure, and local environment setup required to start contributing to the platform.

## Prerequisites

Before cloning the repository, ensure your local environment has the following dependencies installed:

- **Node.js**: `v18+` or ideally `v22` (matching our Alpine production images). We recommend using `nvm` to manage Node versions. You can run `nvm use` in the project root to load the version specified in `.nvmrc`.
- **Package Manager**: `pnpm` (`>=9.12.0`, currently locked to `10.0.0` in `package.json`). Enable it globally using `corepack enable` after installing Node.
- **Docker & Docker Compose**: Required for running the infrastructure layer (Neo4j, Postgres, Redis, Observability stack).
- **Python**: `v3.10+` for certain scripting, validation hooks, and ingestion pipelines (also used for `jsonschema` verification in evidence contracts).

## Repository Structure Overview

Summit operates as a large monorepo leveraging `pnpm` workspaces. Here is a high-level overview of the major directories:

- `apps/`: User-facing applications (e.g., `apps/web` for frontend, `apps/gateway` for API Gateway).
- `packages/`: Shared libraries, SDKs, and internal utilities used across multiple applications and services.
- `services/`: Backend microservices (e.g., `services/rag`, `services/prov-ledger`, `services/api-gateway`).
- `client/` & `server/`: Legacy React frontend and Express backend (currently being strangled and migrated to `apps/` and `services/`).
- `docs/`: Extensive project documentation, including architecture decision records (`docs/adr/`), operator playbooks (`docs/operators/`), and runbooks (`docs/runbooks/`).
- `scripts/`: System health checks, CI/CD validation, orchestration hooks, and deployment utilities.
- `environments/`: Declarative deployment environment configurations.
- `tests/`: End-to-end, integration, and smoke test suites.

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
```

### 2. Install Dependencies

Ensure your Node environment is configured, then install monorepo dependencies.

```bash
nvm use
corepack enable
pnpm install
```

_(Note: Always use `pnpm install` at the root. Do not use `npm install` or `yarn install`.)_

### 3. Environment Variable Configuration

Copy the example environment configuration file to set up your local secrets and endpoints.

```bash
cp .env.example .env
```

Review `.env` and fill in any placeholder values, particularly `OPENAI_API_KEY` or other external service keys if you are working on AI or ingestion features.

### 4. Start Infrastructure

The local infrastructure (Postgres, Neo4j, Redis, Prometheus, Grafana) is containerized. Note that `docker-compose.yml` relies on a custom network. If you are starting it manually for the first time:

```bash
docker network create intelgraph 2>/dev/null || true
docker-compose up -d
```

### 5. Run Database Migrations

Apply the database schemas for Postgres and Neo4j.

```bash
pnpm db:migrate
pnpm db:seed
```

### 6. Start the Development Servers

Run the web frontend and API servers in development mode.

```bash
pnpm dev
```

The primary services will be available at:

- **Frontend**: `http://localhost:3000`
- **GraphQL API / Server**: `http://localhost:4000/graphql`
- **Neo4j Browser**: `http://localhost:7474` (default local credentials usually `neo4j` / `test1234`)
- **Grafana**: `http://localhost:3001`

---

## 🌟 The "Golden Path" (Recommended)

For a deterministic, clean bring-up of the entire local development environment without manual step-by-step execution, use the Golden Path script:

```bash
./scripts/golden-path.sh
```

Alternatively, you can run the equivalent Make commands:

```bash
make clean      # Clean build artifacts and docker system
make bootstrap  # Install Python venv and Node dependencies
make up         # Start all services via Docker Compose
```

Refer to `docs/dev/golden-path-troubleshooting.md` if you encounter common issues such as Docker rate limits.
