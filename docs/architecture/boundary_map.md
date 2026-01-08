# Repository Boundary Map

This document outlines the high-level boundaries, module organization, and data flows within the IntelGraph monorepo. It serves as a guide for navigating the codebase and understanding where new features should reside.

## High-Level Structure

The repository is organized as a **pnpm workspace** monorepo with the following top-level directories:

- **`apps/`**: Application entrypoints (e.g., `web`, `mobile-native`, `gateway`).
- **`services/`**: Microservices and workers (150+). Organized by domain (e.g., `ai-*`, `graph-*`, `audit-*`).
- **`packages/`**: Shared libraries, SDKs, and utilities consumed by apps and services.
- **`server/`**: Core Node.js API server (Legacy/Monolith transition).
- **`client/`**: React web client (Legacy/Main frontend).
- **`docs/`**: Comprehensive documentation.
- **`infra/`, `k8s/`, `helm/`, `terraform/`**: Infrastructure as Code.
- **`tools/`**: Developer tooling and CLI (`summitctl`).

## Module Boundaries & Ownership

### 1. Core Platform (`server/`, `client/`)

- **Description**: The foundational API server and web client.
- **Ownership**: Core Engineering (`@intelgraph-core`)
- **Key Components**:
  - `server/src`: Express/Apollo Server, Database Access (Neo4j, Postgres).
  - `client/src`: React frontend, Apollo Client.

### 2. Microservices (`services/`)

- **Description**: Domain-specific services.
- **Ownership**: Domain Teams (e.g., AI, Graph, Security).
- **Key Domains**:
  - **AI/ML**: `services/ai-*`, `services/ml-*`, `services/copilot`.
  - **Graph**: `services/graph-*`, `services/provenance`.
  - **Security/Audit**: `services/audit-*`, `services/policy-*`, `services/opa`.
  - **Ingestion**: `services/ingest-*`, `services/etl-*`.

### 3. Shared Packages (`packages/`)

- **Description**: Reusable code shared across apps and services.
- **Ownership**: Platform Infra / Shared Libs.
- **Key Packages**:
  - `packages/types`: Shared TypeScript definitions.
  - `packages/logger`: Standard logging library.
  - `packages/utils`: Common utilities.

## Data Flows

1.  **Ingestion**: `services/ingest-*` -> Kafka/Queue -> `services/etl-*` -> Neo4j/Postgres.
2.  **API Request**: Client -> `apps/gateway` (or `server/`) -> AuthZ (OPA) -> Service/Resolver -> DB.
3.  **Events**: Services emit events to `provenance-ledger` for immutable audit trail.

## Hot Files (Avoid Concurrent Edits)

These files are frequently touched or central to the build/config. **Avoid modifying them unless necessary** and coordinate if you do.

- `package.json` (Root and Workspace roots)
- `pnpm-workspace.yaml`
- `docker-compose.yaml` (and overrides)
- `Makefile`
- `server/src/index.ts` (Server Entrypoint)
- `server/src/app.ts` (App Configuration)
- `client/src/App.tsx` (Client Entrypoint)
- `.github/workflows/*` (CI/CD Pipelines)
- `server/src/graphql/schema.ts` (Global Schema)

## Where to Add New Code

- **New Independent Service**: Create a new directory in `services/<service-name>`. Use the standard service template.
- **New Shared Logic**: Create a new package in `packages/<package-name>`.
- **New Core API Feature**: Add to `server/src/modules/<feature>` or `server/src/services/<FeatureService>`.
- **New Frontend Feature**: Add to `client/src/features/<feature>` or `apps/web/src`.
- **Documentation**: Add to `docs/`.

## Extension Points

- **Plugins**: Use `packages/plugin-system` (if available) or service-specific plugin directories.
- **Webhooks**: Register webhooks in `services/webhooks`.
- **Config**: Use `server/src/config` for environment-based configuration.
