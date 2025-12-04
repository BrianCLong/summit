# GEMINI.md - Google Gemini Instructions for Summit/IntelGraph

> **Purpose**: This file provides context for Google Gemini AI when assisting with this codebase.
> **Last Updated**: 2025-12-03

## Project Overview

**Summit/IntelGraph** is a next-generation intelligence analysis platform with AI-augmented graph
analytics designed for the intelligence community. It's a pnpm workspace monorepo managed by Turbo.

### Core Philosophy

- **Golden Path**: `make bootstrap && make up && make smoke` - fresh clones must go green
- **Deployable-First**: Maintain the workflow: Investigation -> Entities -> Relationships -> Copilot
  -> Results
- **Production-Ready MVP**: Every commit should maintain production readiness

## Repository Structure

```
summit/
├── apps/           # Application entrypoints (server, web, gateway)
├── packages/       # Shared libraries and utilities
├── services/       # 150+ microservices and workers
├── client/         # React web client
├── server/         # Node.js API server
├── scripts/        # Build and deployment scripts
├── docs/           # Documentation (125+ files)
├── infra/          # Infrastructure as code
├── k8s/            # Kubernetes manifests
├── helm/           # Helm charts
├── terraform/      # Terraform configurations
└── tests/          # Cross-cutting test suites
```

## Technology Stack

### Backend

- **Runtime**: Node.js 18+
- **API**: Express, Apollo Server (GraphQL federation)
- **Graph Database**: Neo4j 5.x
- **Relational Database**: PostgreSQL 15+
- **Cache/Queue**: Redis, Kafka/Redpanda
- **Auth**: OIDC/JWKS SSO, RBAC+ABAC (OPA)
- **Observability**: OpenTelemetry, Prometheus, Grafana

### Frontend

- **Framework**: React 18+ with TypeScript
- **GraphQL Client**: Apollo Client
- **UI Components**: Material-UI (MUI)
- **Bundler**: Vite

### Languages

- TypeScript 5.3.3+ (strict: false for gradual migration)
- Node.js ESM modules (type: "module")
- Python 3.11+ for ML/data pipelines

## Development Commands

### Package Manager: pnpm

Always use pnpm, never npm or yarn:

```bash
pnpm install                              # Install all dependencies
pnpm --filter @intelgraph/api install     # Install for specific workspace
pnpm add <package> --filter @workspace    # Add dependency to workspace
```

### Build & Test

```bash
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint code
pnpm typecheck    # Type check
```

### Make Targets

```bash
make bootstrap    # Setup: install deps, create .env
make up           # Start dev stack
make up-ai        # Start dev + AI stack
make down         # Stop services
make smoke        # Run golden path tests
```

## Code Conventions

### TypeScript Configuration

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "jsx": "react-jsx",
  "strict": false,
  "skipLibCheck": true
}
```

### Formatting (Prettier)

- Semicolons: required
- Quotes: single
- Trailing commas: all
- Tab width: 2 spaces
- Print width: 80 characters

### Naming Conventions

- **Files**: camelCase for TypeScript, PascalCase for React components
- **Variables/Functions**: camelCase
- **Classes/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Database columns**: snake_case

### Import Order

1. External dependencies (react, apollo-server)
2. Internal packages (@intelgraph/\*)
3. Relative imports (./utils, ../components)

Alphabetized within each group.

## Git Workflow

### Commit Messages (Conventional Commits)

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
```

Examples:

- `feat(api): add entity search endpoint`
- `fix(graph): resolve neo4j connection timeout`

### Branch Naming

- `main` - Production-ready, protected
- `feature/<name>` - Feature branches
- `<username>/<description>` - Personal branches

## Testing

### Test Types

1. **Unit Tests**: Jest with SWC transformer
2. **Integration Tests**: Jest with service mocks
3. **E2E Tests**: Playwright
4. **Smoke Tests**: Golden path validation (`make smoke`)

### Test Conventions

- Files: `*.test.ts`, `*.spec.ts`
- Never use `.only()` or `.skip()` in committed code
- Use Arrange/Act/Assert pattern
- Mock external services in unit tests
- Target 80%+ coverage for changed code

## Security Requirements

### Never Commit

- Secrets or credentials
- `.env` files (use `.env.example`)
- Default passwords in production configs

### Pre-commit Hooks

- Gitleaks: Secret scanning
- ESLint + Prettier: Code quality
- Commitlint: Commit message format

## GraphQL Conventions

- **Types**: PascalCase (Entity, Investigation)
- **Fields**: camelCase (createdAt, entityType)
- **Input types**: PascalCase with Input suffix (CreateEntityInput)
- **Enums**: PascalCase with UPPER_SNAKE_CASE values

## Development Endpoints

| Service        | URL                           |
| -------------- | ----------------------------- |
| Frontend       | http://localhost:3000         |
| GraphQL API    | http://localhost:4000/graphql |
| Neo4j Browser  | http://localhost:7474         |
| Postgres Admin | http://localhost:8080         |
| Prometheus     | http://localhost:9090         |
| Grafana        | http://localhost:3001         |

## AI Assistant Guidelines

### DO

- Follow existing patterns and conventions
- Add tests for new functionality
- Handle errors gracefully
- Use TypeScript types/interfaces
- Check security implications
- Run `make smoke` after changes

### DON'T

- Commit secrets or credentials
- Skip the smoke test
- Use `any` excessively
- Introduce breaking changes without discussion
- Leave `.only()` or `.skip()` in tests

## Quick Reference

```bash
# Full setup and validation
make bootstrap && make up && make smoke

# Development workflow
pnpm dev          # Start dev servers
pnpm build        # Build all
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm typecheck    # Type check

# Cleanup
make down
docker system prune -af
```

---

**Remember**: The golden path is sacred. Keep it green!
