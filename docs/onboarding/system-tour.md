# System Tour: IntelGraph + Maestro

This map highlights the directories and artifacts new engineers should know on day one. Start here when you need to trace where a service, pipeline, or control plane lives.

## Core Application Surfaces

- **IntelGraph API & App**
  - `apps/intelgraph-api/` — API service surfaces specific to IntelGraph.
  - `server/` — Node/Express + GraphQL backend; health checks, auth, and resolver logic.
  - `client/` — React frontend (Vite) for the main user interface.
  - `packages/graphql/` — Shared GraphQL schema and generated types used across services.
- **Maestro Orchestration**
  - `src/maestro/`, `packages/maestro-*` — Core Maestro workflow runtime and SDKs.
  - `deploy/maestro/`, `charts/maestro/` — Deployment manifests and Helm charts.
  - `docs/maestro/` and `docs/maestro-conductor/` — Architecture notes and runbooks for conductor flows.

## Data & Integration Layers

- **Datastores**
  - `server/db/{migrations,seeds}/postgres` — Relational schema and seeds.
  - `server/db/{migrations,seeds}/neo4j` — Graph schema artifacts.
  - `packages/db/` — Reusable DB utilities and Knex/Prisma configurations.
- **Ingestion & Connectors**
  - `services/` — Microservices and adapters (agent gateway, ingestion, analytics).
  - `scripts/seed/`, `scripts/devkit/` — Demo data and developer fixtures.

## Operations & CI/CD

- **Pipelines**
  - `.github/workflows/` — GitHub Actions pipelines for CI, release, and quality gates.
  - `pipelines/`, `scripts/ci/`, `scripts/validate*.{js,ts}` — Supplemental CI scripts and policy checks.
- **Environments & IaC**
  - `deploy/`, `charts/`, `helm/`, `terraform/` — Deployment configurations for Kubernetes, Helm, and cloud infra.
  - `docker-compose*.yml`, `Dockerfile*` — Local dev and production container builds.
- **Release Management**
  - `release/`, `release_playbook/`, `release-please-config.json` — Templates and automation for versioning and change management.

## Security & Compliance

- **Policies & Audits**
  - `security/`, `policies/`, `privacy/` — Security baselines, access controls, and privacy policies.
  - `AUDIT_COMPLIANCE_IMPLEMENTATION.md`, `CI_CD_AUDIT_REPORT.md` — Evidence packs and compliance reports.
- **Supply Chain & Secrets**
  - `scripts/security-*`, `scripts/verify-*`, `scripts/ci/prod-config-check.ts` — Guardrails for dependencies, secrets, and build artifacts.
  - `.github/CODEOWNERS`, `.gitleaks.toml` (if present) — Ownership and secret scanning rules.

## Developer Experience

- **Onboarding & Docs**
  - `docs/onboarding/` — Bootcamp guide, system tour (this file), and fast-start guides.
  - `docs/DEVELOPER_ONBOARDING.md`, `docs/GOLDEN_PATH.md` — Additional workflows and golden paths.
- **Tooling**
  - `scripts/` — Automation for setup, migrations, smoke tests, and maintenance.
  - `tools/`, `packages/*` — Shared CLIs and libraries used by multiple services.

Keep this map nearby while ramping. When in doubt, search the directory mentioned here before creating new patterns elsewhere.
