# Development Setup & Repository Structure

Welcome to the Summit development setup guide. This document covers the repository structure and how to configure your local environment.

## Repository Structure Overview

Summit is a monorepo organizing various services, evaluations, and scripts:

- `adapters/` - External agent ecosystem adapters (LangGraph, OpenAI Agents, AutoGen, CrewAI). Shared utilities for converting external framework artifacts into Summit protocol formats are in `adapters/conversion.ts`.
- `deploy/` & `deploy/compose/` - Docker Compose deployment configurations.
- `deploy/helm/` - Kubernetes Helm charts.
- `docs/` - Project documentation.
  - `docs/architecture/` - Architecture documents (e.g., `summit-graph.schema.json`).
  - `docs/contributing/` - Contribution guidelines (this directory).
  - `docs/monitoring/` - Observability stack configuration guides (OTel, Prometheus, etc.).
  - `docs/product/` - Product-level documentation (vision, roadmap, strategy).
  - `docs/research/` - Research artifacts and reports.
  - `docs/runbooks/` - Runbooks for alerts and incident response.
  - `docs/security/` - Security architecture and threat models.
- `evals/` - Evaluation harnesses.
  - `evals/hallucination/` - Hallucination detection evaluation harness for GraphRAG.
  - `evals/model-comparison/` - Multi-model evaluation harness comparing LLM backends.
  - `evals/narrative/` - Narrative coherence evaluation harness for GraphRAG.
  - `evals/performance/` & `evals/latency/` - Performance and latency benchmarks.
  - `evals/regression/` - Regression tests for known bugs and fixed issues.
- `evaluation/benchmarks/` - Summit Bench benchmark case definitions (`evaluation/benchmarks/<category>/cases.json`).
- `GOLDEN/datasets/` - Deterministic benchmark datasets, fixtures, and expected outputs.
- `scripts/` - Automation and tooling.
  - `scripts/monitoring/` - Repository health monitoring and drift detection scripts.
  - `scripts/ci/` - CI pipeline scripts (e.g., `validate_workflows.mjs`).
  - `scripts/orchestration/` - Jules orchestration scripts.
- `sdk/` - Client and internal SDKs (e.g., `agent-adapter.ts`).
- `summit/` - Python backend services.

## Local Development Environment Setup

### 1. Prerequisites

- **Node.js** (v20+ recommended)
- **pnpm** (used for Node package management)
- **Python** (v3.10+ recommended)
- **Docker** & **Docker Compose**
- **Make**

### 2. Dependencies

Install Node.js dependencies at the repository root:
```bash
pnpm install
```

For the Python backend (`summit/`), we recommend using a virtual environment (e.g., python3 -m virtualenv).

### 3. Environment Variables

Create a local `.env` file at the root of the repository. Use the provided template as a starting point. Ensure you have values for:
- Database connection strings
- Redis cache URLs
- Auth0 configuration (for JWT authentication)
- External API keys (LLMs, Stripe Connect, etc.)

**Important:** Never commit secrets to the repository. Use `.env` files locally and secure secret managers in production.

### 4. Database Setup

Summit's backend architecture uses a multi-tenant PostgreSQL (schema-per-customer) and Redis caching.

To start the local database and required infrastructure using Docker Compose:
```bash
make up
# OR
docker-compose -f deploy/compose/docker-compose.yml up -d
```

Run database migrations to initialize the schema:
```bash
pnpm run db:migrate
# OR within Python
cd summit && python manage.py migrate
```

### 5. Verify the Setup

Once dependencies are installed and the infrastructure is running, you can run the Golden Path sequence to ensure your environment is healthy:

```bash
make bootstrap && make up && make smoke
```
