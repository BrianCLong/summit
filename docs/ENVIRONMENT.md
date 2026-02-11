# IntelGraph Environment Baseline

This document describes the baseline environment and toolchain for the IntelGraph platform.

## Toolchain

- **Node.js**: v18.18+ (enforced via `package.json`)
- **Package Manager**: pnpm v10.0.0
- **Workspace Management**: pnpm workspaces
- **Language**: TypeScript v5.7.3
- **Python**: v3.11+ (for ML and data pipelines)
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes (Helm)

## Services Baseline

- **API**: Node.js, Express, Apollo Server (GraphQL)
- **Graph DB**: Neo4j v5.x
- **Metadata Store**: PostgreSQL v15+
- **Cache**: Redis v7.x
- **Streaming**: Kafka / Redpanda
- **Auth**: OIDC, OPA (ABAC)

## Development Workflow

1.  **Install dependencies**: `pnpm install`
2.  **Start infrastructure**: `docker-compose up -d`
3.  **Run migrations**: `pnpm db:migrate`
4.  **Start dev servers**: `pnpm dev`
5.  **Run tests**: `pnpm test`

## Environment Variables

Refer to `.env.example` for required configuration. Key categories include:
- Database connection strings (Postgres, Neo4j, Redis)
- JWT secrets and OIDC configuration
- API keys for external OSINT providers
- Feature flags and SLO targets
