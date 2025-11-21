# CLAUDE.md - AI Assistant Guide for Summit/IntelGraph Platform

> **Last Updated**: 2025-11-20
> **Purpose**: This document provides AI assistants with comprehensive context about the Summit/IntelGraph codebase structure, development workflows, and key conventions.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Development Environment](#development-environment)
4. [Key Technologies](#key-technologies)
5. [Development Workflows](#development-workflows)
6. [Code Conventions](#code-conventions)
7. [Testing Strategy](#testing-strategy)
8. [Common Tasks](#common-tasks)
9. [Security & Compliance](#security--compliance)
10. [Important Files & Locations](#important-files--locations)

---

## Project Overview

**Summit/IntelGraph** is a next-generation intelligence analysis platform with AI-augmented graph analytics. It's designed for the intelligence community with deployability-first principles.

### Core Philosophy

- **Golden Path**: `make bootstrap && make up && make smoke` - fresh clones must go green before writing code
- **Deployable-First**: All changes must maintain the golden workflow: Investigation → Entities → Relationships → Copilot → Results
- **Production-Ready MVP**: Every commit should maintain production readiness

### Key Capabilities

- Graph-based intelligence analysis (Neo4j)
- Real-time collaboration
- AI/ML-augmented insights
- Enterprise security & compliance
- Multi-database architecture (Neo4j, PostgreSQL, Redis)
- GraphQL API with federation support
- React-based frontend

---

## Codebase Structure

### Monorepo Organization

This is a **pnpm workspace** monorepo managed by **Turbo** with the following structure:

```
summit/
├── apps/                    # Application entrypoints
│   ├── server/             # Main API server
│   ├── web/                # React web application
│   ├── gateway/            # API gateway
│   ├── analytics-engine/   # Analytics services
│   └── [18 more apps]      # Various specialized services
│
├── packages/               # Shared libraries and utilities
│   ├── blueprints/         # Shared components
│   ├── adc/                # Application data contracts
│   ├── active-measures-module/
│   └── [many more]         # Domain-specific packages
│
├── services/               # Microservices and workers
│   ├── api/                # GraphQL API service
│   ├── graph-api/          # Graph-specific API
│   ├── copilot/            # AI copilot service
│   ├── policy/             # Policy engine (OPA)
│   └── [150+ services]     # Extensive service ecosystem
│
├── client/                 # Legacy/alternative client (workspace member)
├── server/                 # Legacy/alternative server (workspace member)
│
├── scripts/                # Build, deployment, and utility scripts
├── docs/                   # Extensive documentation (125+ files)
├── infra/                  # Infrastructure as code
├── k8s/                    # Kubernetes manifests
├── helm/                   # Helm charts
├── terraform/              # Terraform configurations
├── tests/                  # Cross-cutting test suites
└── tools/                  # Development tools

```

### pnpm Workspace Configuration

Defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
  - 'contracts/*'
  - 'server'
  - 'client'
  - 'tools/*'
exclude:
  - 'archive/**'
```

### Important Top-Level Directories

- **`archive/`**: Excluded from CI/caches - historical evidence moved out of hot path
- **`.archive/`**: Additional archived content
- **`.disabled/`**: Temporarily disabled features/services
- **`docs/`**: Comprehensive documentation including architecture, onboarding, runbooks
- **`RUNBOOKS/`**: Operational runbooks
- **`SECURITY/`**: Security documentation and policies
- **`ops/`**: Operations scripts and configurations
- **`observability/`**: Prometheus, Grafana configs, and monitoring dashboards

---

## Development Environment

### Prerequisites

```bash
# Required
- Docker Desktop ≥ 4.x (8GB memory, BuildKit enabled)
- Node.js ≥ 18.18
- pnpm ≥ 9.12.0 (via `corepack enable`)
- Python ≥ 3.11

# Recommended
- Make
- Git
```

### Quick Start

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Bootstrap environment (installs deps, creates .env)
make bootstrap

# Start all services
make up

# Verify golden path
make smoke
```

### Service Endpoints (Development)

| Service            | URL                           | Purpose                   |
| ------------------ | ----------------------------- | ------------------------- |
| **Frontend**       | http://localhost:3000         | React application         |
| **GraphQL API**    | http://localhost:4000/graphql | Apollo GraphQL Playground |
| **Neo4j Browser**  | http://localhost:7474         | Graph database UI         |
| **Postgres Admin** | http://localhost:8080         | Database admin (Adminer)  |
| **Prometheus**     | http://localhost:9090         | Metrics                   |
| **Grafana**        | http://localhost:3001         | Observability dashboards  |

### Environment Configuration

- **`.env.example`**: DEV-ONLY defaults with full documentation
- **`.env.production.sample`**: Empty placeholders for production
- **`.env`**: Generated by `make bootstrap`, gitignored

### Docker Compose Profiles

| Profile                            | Purpose                              | Command      |
| ---------------------------------- | ------------------------------------ | ------------ |
| `docker-compose.dev.yml`           | Core stack (API, dbs, observability) | `make up`    |
| `docker-compose.ai.yml`            | AI/ML services (Kafka, AI worker)    | `make up-ai` |
| `docker-compose.db.yml`            | Databases only                       | Manual       |
| `docker-compose.observability.yml` | Full observability stack             | Manual       |
| `docker-compose.minimal.yml`       | Minimal services for quick testing   | Manual       |
| `docker-compose.opa.yml`           | Policy engine (OPA)                  | Manual       |

### Docker Services (dev stack)

| Service    | Container Name  | Port(s)    | Health Check              |
| ---------- | --------------- | ---------- | ------------------------- |
| PostgreSQL | summit-postgres | 5432       | `pg_isready`              |
| Redis      | summit-redis    | 6379       | `redis-cli ping`          |
| Neo4j      | summit-neo4j    | 7474, 7687 | `cypher-shell "RETURN 1"` |
| API        | summit-api      | 4000       | `/health/ready`           |
| Gateway    | summit-gateway  | 4100       | `/health`                 |

### Environment Variables Reference

**Core Application:**

```bash
NODE_ENV=development          # development | production | test
PORT=4000                     # API server port
CLIENT_PORT=3000              # Frontend port
APP_URL=http://localhost:3000 # Frontend URL
API_URL=http://localhost:4000 # API URL
VITE_API_URL=http://localhost:4000/graphql  # Vite client env
```

**Database Connections:**

```bash
# PostgreSQL
DATABASE_URL=postgresql://summit:devpassword@localhost:5432/summit_dev
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=summit_dev
POSTGRES_USER=summit
POSTGRES_PASSWORD=devpassword  # DEV-ONLY

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword     # DEV-ONLY
NEO4J_DATABASE=neo4j

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=devpassword     # DEV-ONLY
```

**Authentication (MUST change in production):**

```bash
JWT_SECRET=your_jwt_secret_key_change_in_production_12345
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_secret_key_change_in_production_67890
JWT_REFRESH_EXPIRES_IN=7d
```

**Security & Rate Limiting:**

```bash
CORS_ORIGIN=http://localhost:3000  # Comma-separated in production
RATE_LIMIT_WINDOW_MS=60000         # 60 seconds
RATE_LIMIT_MAX=600                 # Max requests per window
BCRYPT_ROUNDS=12
```

**AI/ML Configuration:**

```bash
ENABLE_AI_FEATURES=true
AI_MODELS_PATH=src/ai/models
AI_ENABLE_GPU=true
AI_MAX_CONCURRENT_JOBS=5
AI_BATCH_SIZE=32
EMBEDDING_MODEL=all-MiniLM-L6-v2
SPEECH_MODEL=whisper-base
```

**Feature Flags:**

```bash
ENABLE_AI_FEATURES=true
ENABLE_REAL_TIME=true
ENABLE_ANALYTICS=true
ENABLE_PLUGINS=true
```

---

## Key Technologies

### Backend Stack

| Layer              | Technology                          | Purpose                                    |
| ------------------ | ----------------------------------- | ------------------------------------------ |
| **API**            | Node.js 18+, Express, Apollo Server | GraphQL federation, schema stitching       |
| **Graph Database** | Neo4j 5.x                           | Entity/relationship storage, graph queries |
| **Relational DB**  | PostgreSQL 15+                      | Case metadata, audit, reporting            |
| **Cache/Queue**    | Redis, Kafka/Redpanda               | Caching, streaming, pub/sub                |
| **Auth**           | OIDC/JWKS SSO, RBAC+ABAC (OPA)      | Authentication, authorization              |
| **Observability**  | OpenTelemetry, Prometheus, Grafana  | Tracing, metrics, logs                     |
| **Orchestration**  | Kubernetes, Helm, Terraform         | Deployment, infrastructure                 |

### Frontend Stack

- **React 18+** with JSX/TSX
- **Apollo Client** for GraphQL
- **Material-UI (MUI)** for components
- **Vite** or similar for bundling

### Language & Runtime

- **TypeScript 5.3.3+** (strict: false for gradual migration)
- **Node.js ESM** modules (type: "module" in package.json)
- **Python 3.11+** for ML/data pipelines

---

## Development Workflows

### Package Manager: pnpm

**Always use pnpm**, not npm or yarn:

```bash
# Install dependencies
pnpm install

# Install in specific workspace
pnpm --filter @intelgraph/api install

# Run commands across workspaces
pnpm -r run build           # Recursive
pnpm -w run <script>        # Workspace root

# Add dependency to workspace
pnpm add <package> --filter @workspace/name
```

### Turbo Build System

```bash
# Build all packages (with caching)
pnpm build
# or
turbo run build --cache-dir=.turbo

# Run tests across workspace
pnpm test
# or
turbo run test --cache-dir=.turbo --continue

# Lint
pnpm lint
turbo run lint --cache-dir=.turbo --continue

# Typecheck
pnpm typecheck
# or
tsc -b tsconfig.build.json
```

### Make Targets

```bash
make bootstrap    # Setup: install deps, create .env, venv
make up           # Start dev stack (docker-compose.dev.yml)
make up-ai        # Start dev + AI stack
make down         # Stop all services
make smoke        # Run golden path smoke tests
make tools        # Build dev tools
```

### Git Workflow

#### Commit Messages

Follow **Conventional Commits** (enforced by commitlint):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

Examples:

```
feat(api): add entity search endpoint
fix(graph): resolve neo4j connection timeout
docs(readme): update quickstart instructions
chore(deps): update pnpm-lock.yaml
```

#### Pre-commit Hooks (Husky)

Automatically runs on commit:

- **Gitleaks**: Secret scanning
- **Lint-staged**: Format and lint changed files
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Ruff/Black**: Python linting/formatting (if applicable)

#### Branching Strategy

- **`main`**: Production-ready code, protected
- **Feature branches**: `feature/<name>` or `<username>/<description>`
- **Claude branches**: `claude/claude-md-<session-id>` for AI assistant work

### CI/CD Pipelines

Defined in `.github/workflows/`:

1. **`ci.yml`**: Runs on every PR + main
   - Cached pnpm install
   - `make bootstrap`, `make up`, `make smoke`
   - Lint, typecheck, Jest tests
   - Playwright/E2E tests
   - SBOM + Trivy scans
   - Docker layer caching

2. **`security.yml`**: Nightly + PR security checks
   - CodeQL analysis
   - Dependency review
   - Gitleaks scanning

3. **`release.yml`**: Semantic release (requires green CI)

All workflows are required checks for merge.

### Pull Request Workflow

**PR Checklist** (from `.github/PULL_REQUEST_TEMPLATE.md`):

- [ ] Code compiles & passes CI
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] OPA policies verified
- [ ] Grafana dashboards updated if applicable

**Copilot Review Tasks** (use in PR comments):

- `/explain-changes` - Get AI explanation of changes
- `/generate-tests` - Generate test suggestions
- `/risk-callouts` - Identify potential risks
- `/summarize-diff` - Summarize the diff

### API Health Endpoints

| Endpoint           | Purpose                    | Expected Response |
| ------------------ | -------------------------- | ----------------- |
| `/health`          | Basic health check         | `200 OK`          |
| `/health/ready`    | Kubernetes readiness probe | `200 OK`          |
| `/health/live`     | Kubernetes liveness probe  | `200 OK`          |
| `/health/detailed` | Detailed health with deps  | JSON status       |
| `/metrics`         | Prometheus metrics         | Prometheus format |

### GraphQL API Structure

**API Location**: `services/api/src/`

```
services/api/src/
├── app.ts           # Express app setup
├── index.ts         # Entry point
├── graphql/         # GraphQL schema & resolvers
├── middleware/      # Auth, rate limiting, etc.
├── routes/          # REST endpoints (health, etc.)
├── db/              # Database connections
├── realtime/        # WebSocket subscriptions
└── utils/           # Shared utilities
```

**GraphQL Playground**: http://localhost:4000/graphql

---

## Code Conventions

### TypeScript Configuration

**Base config**: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": false, // Gradual strictness migration
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

**Project References**: `tsconfig.build.json` orchestrates workspace compilation

### ESLint Configuration

**Flat config** (ESLint v9): `eslint.config.js`

```javascript
// Key rules:
- '@typescript-eslint/no-unused-vars': 'warn' (ignore _prefixed)
- 'no-console': 'warn'
- 'no-debugger': 'error'
- '@typescript-eslint/no-explicit-any': 'off' (pragmatic)
- Import order: alphabetized with newlines between groups
```

**Legacy config**: `.eslintrc.cjs` for older packages

### Prettier Configuration

`.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### File Naming Conventions

- **TypeScript/JavaScript**: camelCase for files, PascalCase for components
  - `entityService.ts`, `EntityCard.tsx`, `useGraphData.ts`
- **Tests**: `*.test.ts`, `*.spec.ts`, or in `__tests__/` directories
- **Configs**: kebab-case (e.g., `tsconfig.json`, `docker-compose.yml`)

### Import Order

Enforced by ESLint:

1. External dependencies (e.g., `react`, `apollo-server`)
2. Internal packages (e.g., `@intelgraph/types`)
3. Relative imports (e.g., `./utils`, `../components`)

Alphabetized within each group, with newlines between groups.

### Code Style Guidelines

1. **Prefer functional components** over class components (React)
2. **Use TypeScript interfaces** for data contracts, types for unions/primitives
3. **Avoid `any`** where possible, but pragmatically allowed
4. **Explicit error handling**: Use try/catch, return error objects
5. **No console.log in production code**: Use proper logging (Winston, Pino)
6. **GraphQL naming**: PascalCase for types, camelCase for fields
7. **Database naming**: snake_case for columns, camelCase in JS/TS

---

## Testing Strategy

### Test Types

1. **Unit Tests**: Jest (SWC transformer)

   ```bash
   pnpm test:jest
   # or
   jest --config jest.projects.cjs --maxWorkers=50%
   ```

2. **Integration Tests**: Jest with database/service mocks

   ```bash
   pnpm test:integration
   ```

3. **E2E Tests**: Playwright

   ```bash
   pnpm e2e
   # or
   playwright test
   ```

4. **Smoke Tests**: Golden path validation
   ```bash
   pnpm smoke
   # or
   make smoke
   # or
   node scripts/smoke-test.js
   ```

### Test File Locations

- **Co-located**: `src/__tests__/`, `src/**/*.test.ts`
- **Dedicated**: `tests/`, `__tests__/` at package root
- **E2E**: `e2e/`, `tests/e2e/`

### Golden Path Testing

**Critical Path**: Investigation → Entities → Relationships → Copilot → Results

The smoke test (`scripts/smoke-test.js`) validates this workflow using the dataset in `data/golden-path/demo-investigation.json`. Local runs match CI exactly.

**Success Criteria**:

- All health checks pass (`/health`, `/health/ready`, `/health/live`)
- GraphQL mutations succeed
- Graph queries return expected data
- Copilot service responds
- No console errors

### Test Conventions

```typescript
// Use descriptive test names
describe('EntityService', () => {
  it('should create entity with valid data', async () => {
    // Arrange
    const entityData = { name: 'Test', type: 'Person' };

    // Act
    const result = await entityService.create(entityData);

    // Assert
    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test');
  });

  it('should throw error when entity type is invalid', async () => {
    // ...
  });
});
```

**Key Rules**:

- No `.only()` or `.skip()` in committed code (enforced by `jest/no-focused-tests`)
- Use `beforeEach`/`afterEach` for setup/teardown
- Mock external services in unit tests
- Use `jest-extended` for additional matchers

---

## Common Tasks

### Adding a New Package

```bash
# Create package directory
mkdir -p packages/my-package/src

# Initialize package.json
cd packages/my-package
pnpm init

# Add to pnpm workspace (already covered by 'packages/*' glob)

# Add dependencies
pnpm add <dependency>

# Build
pnpm build
```

### Adding a New Service

```bash
# Create service directory
mkdir -p services/my-service/src

# Copy template or initialize
# Ensure package.json has correct structure

# Add to docker-compose if needed
```

### Database Migrations

#### PostgreSQL (Prisma)

```bash
pnpm db:pg:migrate      # Apply migrations
pnpm db:pg:generate     # Generate Prisma client
pnpm db:pg:status       # Check migration status
```

#### PostgreSQL (Knex)

```bash
pnpm db:knex:migrate    # Apply migrations
pnpm db:knex:rollback   # Rollback last batch
```

#### Neo4j

```bash
pnpm db:neo4j:migrate   # Custom migration scripts
```

### GraphQL Schema Changes

1. **Update schema**: Edit `packages/graphql/schema.graphql` or service-specific schema
2. **Check for breaking changes**:
   ```bash
   pnpm graphql:schema:check
   ```
3. **Regenerate types**:
   ```bash
   pnpm graphql:codegen
   ```
4. **Update persisted queries** (if using):
   ```bash
   pnpm persisted:build
   pnpm persisted:check   # Verify no drift
   ```

### Running Specific Services

```bash
# API server only
pnpm server:dev
# or
cd server && pnpm dev

# Client only
pnpm client:dev
# or
cd client && pnpm dev

# Specific workspace package
pnpm --filter @intelgraph/api dev
```

### Debugging

```bash
# View logs
make logs
# or
docker-compose -f docker-compose.dev.yml logs -f <service>

# Attach to running container
docker exec -it <container-name> /bin/bash

# Check health endpoints
curl http://localhost:4000/health
curl http://localhost:4000/health/detailed | jq
curl http://localhost:4000/metrics

# Neo4j Cypher shell
docker exec -it <neo4j-container> cypher-shell -u neo4j -p devpassword
```

---

## Security & Compliance

### Production Guardrails

The API **refuses to boot in production** if:

- `JWT_SECRET` or `JWT_REFRESH_SECRET` match known defaults
- Database passwords are default values
- CORS allow-lists include `localhost/*`
- `NODE_ENV=production` without proper secrets

**Script**: `scripts/ci/prod-config-check.ts` (run in CI: `pnpm ci:prod-guard`)

### Secrets Management

- **Never commit secrets**: Use `.env` (gitignored)
- **Secret scanning**: Gitleaks runs on every commit (pre-commit hook + CI)
- **Production secrets**: Managed via Kubernetes secrets, Vault, or cloud provider

### Security Scanning

- **Dependency scanning**: `pnpm audit`, Dependabot, Snyk (if configured)
- **Container scanning**: Trivy in CI
- **SBOM generation**: `attest-sbom.yml` workflow
- **CodeQL**: Static analysis in `security.yml`

### Compliance Requirements

- **Audit logging**: All mutations logged to `audit_svc`
- **Provenance tracking**: `prov-ledger` service maintains chain-of-custody
- **RBAC+ABAC**: Open Policy Agent (OPA) for fine-grained access control
- **Data classification**: Policy labels on entities/relationships

---

## Important Files & Locations

### Configuration Files

| File                     | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `package.json`           | Root package, scripts, workspace config    |
| `pnpm-workspace.yaml`    | pnpm workspace definition                  |
| `turbo.json`             | Turbo build pipeline configuration         |
| `tsconfig.base.json`     | Base TypeScript config                     |
| `tsconfig.build.json`    | Project references for workspace builds    |
| `eslint.config.js`       | ESLint v9 flat config                      |
| `.eslintrc.cjs`          | Legacy ESLint config                       |
| `.prettierrc`            | Prettier formatting rules                  |
| `Makefile`               | Golden path targets (bootstrap, up, smoke) |
| `.env.example`           | Development environment template           |
| `docker-compose.dev.yml` | Development stack definition               |
| `docker-compose.ai.yml`  | AI/ML services stack                       |

### Key Documentation

| File/Directory                 | Purpose                              |
| ------------------------------ | ------------------------------------ |
| `README.md`                    | Project overview, quickstart         |
| `docs/ARCHITECTURE.md`         | System architecture, stack details   |
| `docs/DEVELOPER_ONBOARDING.md` | 30-minute developer onboarding guide |
| `docs/ONBOARDING.md`           | Day-one onboarding                   |
| `docs/REPOSITORY_STRUCTURE.md` | Codebase organization                |
| `docs/Copilot-Playbook.md`     | AI copilot usage guide               |
| `docs/TESTPLAN.md`             | Testing strategy and plans           |
| `RUNBOOKS/`                    | Operational runbooks                 |
| `SECURITY/`                    | Security policies and guidelines     |

### Key Scripts

| Script                            | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| `start.sh`                        | One-command startup (wraps make targets) |
| `scripts/smoke-test.js`           | Golden path validation                   |
| `scripts/wait-for-stack.sh`       | Block until services ready               |
| `scripts/health-check.sh`         | Health probe automation                  |
| `scripts/ci/prod-config-check.ts` | Production config validation             |
| `scripts/setup.sh`                | Initial setup automation                 |
| `scripts/cleanup-repository.sh`   | Repository cleanup                       |

### Data & Fixtures

| Location                                   | Purpose                  |
| ------------------------------------------ | ------------------------ |
| `data/golden-path/demo-investigation.json` | Golden path test dataset |
| `scripts/devkit/seed-fixtures.js`          | Seed demo data           |
| `scripts/seed/`                            | Additional seed scripts  |

---

## Working with AI Assistants (Claude, Copilot, etc.)

### Best Practices for AI Assistance

1. **Always run tests after changes**:

   ```bash
   make smoke          # Golden path
   pnpm test           # Unit tests
   pnpm lint           # Linting
   pnpm typecheck      # Type checking
   ```

2. **Reference this file** when asking for help:
   - "Following CLAUDE.md conventions, add a new service..."
   - "Update the GraphQL schema according to the project standards..."

3. **Provide context**:
   - Current working directory
   - Relevant error messages
   - Files you've already examined

4. **Validate changes**:
   - Check that imports are correct
   - Ensure formatting matches conventions
   - Verify no secrets are committed

### Common AI Assistant Tasks

#### Task: Add a new GraphQL resolver

```typescript
// 1. Update schema (packages/graphql/schema.graphql or service schema)
type Entity {
  id: ID!
  name: String!
  type: String!
}

extend type Query {
  entity(id: ID!): Entity
}

// 2. Implement resolver (services/api/src/resolvers/entity.ts)
export const entityResolvers = {
  Query: {
    entity: async (_parent, { id }, context) => {
      // Check authorization
      await context.authorize('entity:read');

      // Fetch from database
      return entityService.findById(id);
    },
  },
};

// 3. Add types (if not using codegen)
// 4. Add tests
// 5. Update persisted queries if needed
```

#### Task: Add a new database migration

```bash
# Prisma
pnpm --filter @intelgraph/db prisma migrate dev --name add_entity_table

# Knex
pnpm --filter @intelgraph/db knex migrate:make add_entity_table
```

#### Task: Add a new component

```typescript
// client/src/components/EntityCard.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface EntityCardProps {
  entity: {
    id: string;
    name: string;
    type: string;
  };
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5">{entity.name}</Typography>
        <Typography color="textSecondary">{entity.type}</Typography>
      </CardContent>
    </Card>
  );
};
```

### Copilot Golden Prompts

Use these prompts for consistent AI-assisted development (from `docs/Copilot-Playbook.md`):

**Tests:**

```
/write-tests for file: packages/ai-core/src/router.ts using vitest + msw; cover error paths and OPA deny.
```

**Policy:**

```
/author OPA rego for dual-control delete with reason-for-access; include unit tests.
```

**Kubernetes/Infra:**

```
/explain k8s manifests in ops/helm/values-prod.yaml and suggest KEDA autoscale rules for p95 latency.
```

**TypeScript:**

```
/extract component from src/ui/Dashboard.tsx into reusable widget with zod schema and prop typing.
```

**Grafana:**

```
/migrate this Grafana panel JSON to a library panel and add SLO burn-rate alerts.
```

### Key Services Overview

| Service       | Location                | Purpose                         |
| ------------- | ----------------------- | ------------------------------- |
| `api`         | `services/api/`         | Main GraphQL API                |
| `graph-api`   | `services/graph-api/`   | Graph-specific operations       |
| `copilot`     | `services/copilot/`     | AI copilot service              |
| `policy`      | `services/policy/`      | OPA policy engine               |
| `audit_svc`   | `services/audit_svc/`   | Audit logging                   |
| `prov-ledger` | `services/prov-ledger/` | Provenance tracking             |
| `ingest`      | `services/ingest/`      | Data ingestion                  |
| `enrichment`  | `services/enrichment/`  | Data enrichment                 |
| `search`      | `services/search/`      | Search service                  |
| `dev-gateway` | `services/dev-gateway/` | Development gateway (port 4100) |

### AI Assistant Guardrails

**DO**:

- ✅ Follow existing patterns and conventions
- ✅ Add tests for new functionality
- ✅ Update documentation when changing behavior
- ✅ Use TypeScript types/interfaces
- ✅ Handle errors gracefully
- ✅ Check security implications (auth, input validation)

**DON'T**:

- ❌ Commit secrets or credentials
- ❌ Skip the smoke test (`make smoke`)
- ❌ Introduce breaking changes without discussion
- ❌ Use `any` excessively
- ❌ Commit with `.only()` or `.skip()` in tests
- ❌ Bypass security guardrails

---

## Troubleshooting

### Common Issues

#### Issue: `pnpm install` fails

```bash
# Clear caches
rm -rf node_modules pnpm-lock.yaml
pnpm store prune
pnpm install
```

#### Issue: Docker services won't start

```bash
# Check ports
lsof -i :3000 -i :4000 -i :5432 -i :6379 -i :7474 -i :7687

# Clean Docker state
make down
docker system prune -af
make up
```

#### Issue: TypeScript errors

```bash
# Rebuild TypeScript project references
pnpm typecheck

# Check specific package
cd packages/my-package
tsc --noEmit
```

#### Issue: Tests failing

```bash
# Run specific test
pnpm test -- entity.test.ts

# Run with verbose output
pnpm test -- --verbose

# Clear Jest cache
jest --clearCache
```

#### Issue: Neo4j connection errors

```bash
# Check Neo4j status
docker exec -it summit-neo4j cypher-shell -u neo4j -p devpassword "RETURN 1"

# View Neo4j logs
docker logs summit-neo4j

# Reset Neo4j data (caution: destroys data)
docker-compose -f docker-compose.dev.yml down -v
make up
```

#### Issue: Smoke test fails

```bash
# Check service health
curl http://localhost:4000/health

# View logs
make logs

# Restart services
make down && make up

# Wait for services
./scripts/wait-for-stack.sh
```

---

## Performance Best Practices

### Query Optimization

**Neo4j Cypher:**

```cypher
// Use indexes for lookups
MATCH (e:Entity {id: $id}) RETURN e

// Limit traversal depth
MATCH path = (e:Entity)-[*1..3]-(related) RETURN path LIMIT 100

// Use parameters to enable query caching
MATCH (e:Entity) WHERE e.type = $type RETURN e
```

**GraphQL:**

- Use persisted queries for production (`pnpm persisted:build`)
- Enable query complexity limits in Apollo Server
- Use DataLoader for N+1 query prevention

### Caching Strategy

| Layer    | Technology | TTL        | Use Case                   |
| -------- | ---------- | ---------- | -------------------------- |
| API      | Redis      | 5-60 min   | Query results, sessions    |
| GraphQL  | Apollo     | Per-query  | Field-level caching        |
| Database | Neo4j      | Built-in   | Query plan caching         |
| CDN      | CloudFront | 1-24 hours | Static assets, API gateway |

### Resource Limits (Development)

```yaml
# Recommended Docker resource allocation
- PostgreSQL: 512MB RAM, 1 CPU
- Neo4j: 2GB RAM (heap), 2 CPU
- Redis: 256MB RAM
- API: 1GB RAM, 2 CPU
```

---

## Additional Resources

### External Documentation

- **Neo4j**: https://neo4j.com/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **GraphQL**: https://graphql.org/learn/
- **Apollo Server**: https://www.apollographql.com/docs/apollo-server/
- **React**: https://react.dev/
- **pnpm**: https://pnpm.io/
- **Turbo**: https://turbo.build/repo/docs

### Internal Links

- **Copilot Playbook**: [docs/Copilot-Playbook.md](docs/Copilot-Playbook.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Onboarding**: [docs/DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md)
- **Repository Structure**: [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md)

---

## Maintenance Notes

### Updating This Document

This document should be updated when:

- Major architectural changes occur
- New conventions are established
- Development workflows change
- New tools or technologies are adopted

**Owner**: Engineering team
**Review Cadence**: Quarterly or as needed

### Version History

- **2025-11-21**: Enhanced with environment variables, Docker services, PR workflow, API structure, Copilot prompts, and key services
- **2025-11-20**: Initial creation (comprehensive audit of codebase)

---

## Quick Reference Card

```bash
# Setup
make bootstrap              # Install deps, setup env
make up                     # Start services
make smoke                  # Validate golden path

# Development
pnpm dev                    # Start dev servers
pnpm build                  # Build all packages
pnpm test                   # Run tests
pnpm lint                   # Lint code
pnpm typecheck              # Type check

# Database
pnpm db:pg:migrate          # PostgreSQL migrations
pnpm db:neo4j:migrate       # Neo4j migrations

# GraphQL
pnpm graphql:codegen        # Generate types
pnpm persisted:build        # Build persisted queries

# CI/CD
pnpm ci                     # Run full CI suite locally
pnpm smoke                  # Smoke tests

# Cleanup
make down                   # Stop services
docker system prune -af     # Clean Docker
```

---

**Remember**: The golden path is sacred. Keep it green! 🟢
