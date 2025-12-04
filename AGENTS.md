# AGENTS.md - AI Coding Agent Instructions

> **Standard Format**: This file follows the [AGENTS.md](https://agents.md) open format for guiding
> coding agents. **Supported By**: OpenAI Codex, Google Jules, Amp, Cursor, Factory, and other AI
> coding assistants. **Last Updated**: 2025-12-03

## Project Overview

**Summit/IntelGraph** is a next-generation intelligence analysis platform with AI-augmented graph
analytics designed for the intelligence community.

### Core Philosophy

- **Golden Path**: `make bootstrap && make up && make smoke` - fresh clones must go green
- **Deployable-First**: Maintain the workflow: Investigation -> Entities -> Relationships -> Copilot
  -> Results
- **Production-Ready MVP**: Every commit should maintain production readiness

## Codebase Structure

This is a **pnpm workspace** monorepo managed by **Turbo**:

```
summit/
├── apps/           # Application entrypoints (server, web, gateway, etc.)
├── packages/       # Shared libraries and utilities
├── services/       # 150+ microservices and workers
├── client/         # React web client
├── server/         # Node.js API server
├── scripts/        # Build, deployment, and utility scripts
├── docs/           # Documentation (125+ files)
├── infra/          # Infrastructure as code
├── k8s/            # Kubernetes manifests
├── helm/           # Helm charts
├── terraform/      # Terraform configurations
└── tests/          # Cross-cutting test suites
```

### Key Directories

- `archive/` - Excluded from CI, historical content
- `.disabled/` - Temporarily disabled features
- `RUNBOOKS/` - Operational runbooks
- `SECURITY/` - Security documentation

## Technology Stack

### Backend

| Layer         | Technology                          | Purpose                      |
| ------------- | ----------------------------------- | ---------------------------- |
| API           | Node.js 18+, Express, Apollo Server | GraphQL federation           |
| Graph DB      | Neo4j 5.x                           | Entity/relationship storage  |
| Relational    | PostgreSQL 15+                      | Case metadata, audit         |
| Cache/Queue   | Redis, Kafka/Redpanda               | Caching, streaming           |
| Auth          | OIDC/JWKS SSO, RBAC+ABAC (OPA)      | Authentication/authorization |
| Observability | OpenTelemetry, Prometheus, Grafana  | Tracing, metrics             |

### Frontend

- React 18+ with JSX/TSX
- Apollo Client for GraphQL
- Material-UI (MUI)
- Vite for bundling

### Languages

- TypeScript 5.3.3+ (strict: false for gradual migration)
- Node.js ESM modules
- Python 3.11+ for ML/data pipelines

## Development Commands

### Package Manager: Always Use pnpm

```bash
# Install dependencies
pnpm install

# Install in specific workspace
pnpm --filter @intelgraph/api install

# Add dependency
pnpm add <package> --filter @workspace/name
```

### Build & Test

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
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

### TypeScript

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "strict": false,
  "skipLibCheck": true
}
```

### Formatting (Prettier)

- Semi: true
- Trailing comma: all
- Single quotes: true
- Print width: 80
- Tab width: 2

### ESLint

- Extend from base config in `tsconfig.eslint.json`
- No `any` unless justified and documented
- Prefer functional/stateless components in React

### React

- Use hooks over class components
- Prefer `useMemo`/`useCallback` for expensive computations
- Keep components small and composable

## Git & PR Workflow

- Conventional Commits required
- Branch naming: `type/scope/short-desc`
- Keep PRs small and focused
- Include tests and docs updates with changes
- Run smoke tests before opening PRs

## Testing Strategy

1. **Unit Tests**: Jest

   ```bash
   pnpm test:unit
   ```

2. **Integration Tests**: Node + API

   ```bash
   pnpm test:integration
   ```

3. **E2E Tests**: Playwright

   ```bash
   pnpm e2e
   ```

4. **Smoke Tests**: Golden path validation
   ```bash
   make smoke
   ```

### Test Conventions

- No `.only()` or `.skip()` in committed code
- Use Arrange/Act/Assert pattern
- Mock external services in unit tests
- Target 80%+ coverage for changed code

## Security Requirements

### Never Commit

- Secrets or credentials
- `.env` files (use `.env.example`)
- Default passwords in production configs

### Production Guardrails

The API refuses to boot if:

- JWT secrets match defaults
- Database passwords are defaults
- CORS includes localhost in production

### Pre-commit Hooks

- Gitleaks: Secret scanning
- ESLint + Prettier: Code quality
- Commitlint: Commit message format

## Database Operations

### PostgreSQL

```bash
pnpm db:pg:migrate      # Apply migrations
pnpm db:pg:generate     # Generate Prisma client
```

### Neo4j

```bash
pnpm db:neo4j:migrate   # Custom migration scripts
```

## GraphQL

```bash
pnpm graphql:codegen        # Generate types
pnpm graphql:schema:check   # Check for breaking changes
pnpm persisted:build        # Build persisted queries
```

## Service Endpoints (Development)

| Service        | URL                           |
| -------------- | ----------------------------- |
| Frontend       | http://localhost:3000         |
| GraphQL API    | http://localhost:4000/graphql |
| Neo4j Browser  | http://localhost:7474         |
| Postgres Admin | http://localhost:8080         |
| Prometheus     | http://localhost:9090         |
| Grafana        | http://localhost:3001         |

## Debugging

```bash
# View logs
make logs

# Check health
curl http://localhost:4000/health

# Neo4j shell
docker exec -it <neo4j-container> cypher-shell -u neo4j -p devpassword
```

## AI Agent Guidelines

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
- Bypass security guardrails

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

## Legacy Guidance (preserved)

- Apps: `server/` (Node/Express/GraphQL), `client/` (React/Vite)
- Docs: `docs/` (guides) and `docs/generated/` (auto-generated overviews)
- Data: `server/db/{migrations,seeds}/{postgres,neo4j}`
- CI/Meta: `.github/`, `scripts/`, `project_management/`

### Build, Test, and Development Commands

- Install: `npm install && (cd server && npm install) && (cd client && npm install)`
- Dev: `npm run dev` (runs server and client concurrently)
- Test: `npm test` (server+client), server only: `cd server && npm test`
- Lint/Format: `npm run lint && npm run format`
- DB: `npm run db:migrate` and `npm run db:seed` (from repo root or `server/`)
- Docker: `npm run docker:dev` or `npm run docker:prod`

### Coding Style & Naming Conventions

- JS/TS: 2-space indent; Prettier + ESLint enforced; Conventional Commits required
- Filenames: `kebab-case` for files/scripts; `PascalCase` for React components
- Configs: `.editorconfig`, `.markdownlint.json`, `commitlint.config.js` present

### Testing Guidelines

- Backend: Jest (`server/tests`), coverage: `cd server && npm run test:coverage`
- Frontend: client tests; e2e via Playwright: `npm run test:e2e`
- Naming: `*.spec.ts`/`*.test.js` (client), `*.test.js` (server); target ≥80% coverage for changed
  code

### Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- PRs: concise description, linked issues (`Closes #123`), screenshots for UI; CI green required
- Branches: `type/scope/short-desc` (e.g., `feat/ingest/rest-connector`)

### Web Codex Global Guidance

Run the scoped CI workflow for `feat/mstc`, `feat/trr`, `feat/opa` when applicable (see previous
instructions for full script). Ensure binaries/large files are sanitized before PRs.

### Security & Configuration Tips

- Use `.env` (copy from `.env.example`); never commit secrets
- Helmet + CORS defaults enabled; restrict `CORS_ORIGIN` in prod
- Run `scripts/bootstrap_github.sh` to set up labels/milestones and import issues

### Architectural North Star

- Reference `docs/FIRST_PRINCIPLES_REDESIGN.md` for major changes
- Strangler pattern: prefer new logic in `packages/` over `server/src/services/`
- Event-first: emit immutable events (Provenance Ledger) over direct DB mutations
- Agent independence: design agents as autonomous actors reacting to event streams

---

**Remember**: The golden path is sacred. Keep it green!
