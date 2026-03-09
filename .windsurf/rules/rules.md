# Windsurf Rules for Summit/IntelGraph

## Project Overview

Summit/IntelGraph is an intelligence analysis platform with AI-augmented graph analytics. This is a
pnpm workspace monorepo managed by Turbo with 150+ services.

## Build System

- Build system: pnpm + Turbo
- Testing framework: Jest (SWC transformer), Playwright for E2E
- Linting: ESLint v9 flat config + Prettier
- Type checking: TypeScript 5.3.3+

## Package Manager Rules

ALWAYS use pnpm commands, NEVER npm or yarn:

- Use `pnpm install` not `npm install`
- Use `pnpm add <package>` not `npm install <package>`
- Use `pnpm --filter @intelgraph/api <command>` for workspace packages

## Code Style Rules

### TypeScript

- Target: ES2022
- Module: ESNext
- Module resolution: Bundler
- Strict mode: false (gradual migration)

### Formatting

- Semicolons: required
- Quotes: single
- Trailing commas: all
- Tab width: 2 spaces
- Print width: 80 characters

### Naming Conventions

- Files: camelCase for TypeScript, PascalCase for React components
- Variables/functions: camelCase
- Classes/interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- Database columns: snake_case

## Import Order

Organize imports in this order:

1. External dependencies (react, apollo-server)
2. Internal packages (@intelgraph/\*)
3. Relative imports (./utils, ../components)

Alphabetize within each group.

## Testing Rules

- Test files: `*.test.ts`, `*.spec.ts`
- Never use `.only()` or `.skip()` in committed code
- Use Arrange/Act/Assert pattern
- Mock external services in unit tests
- Target 80%+ coverage for changed code

## Security Rules

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user inputs
- Check authorization before data access
- Never commit `.env` files

## Commit Message Format

Use Conventional Commits:

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
```

## Key Commands

```bash
# Setup and validation
make bootstrap && make up && make smoke

# Development
pnpm dev          # Start dev servers
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm typecheck    # Type check

# Database
pnpm db:pg:migrate
pnpm db:neo4j:migrate

# GraphQL
pnpm graphql:codegen
```

## Technology Stack

### Backend

- Node.js 18+, Express, Apollo Server
- Neo4j 5.x for graph database
- PostgreSQL 15+ for relational data
- Redis for caching
- Kafka/Redpanda for streaming

### Frontend

- React 18+ with TypeScript
- Apollo Client for GraphQL
- Material-UI (MUI) components
- Vite for bundling

### Infrastructure

- Docker/Kubernetes
- Terraform
- Helm charts

## Files/Directories to Ignore

Don't modify files in these directories:

- `archive/` - Historical content
- `.disabled/` - Temporarily disabled features
- `node_modules/`
- `dist/`
- `.turbo/`

## GraphQL Conventions

- Types: PascalCase (Entity, Investigation)
- Fields: camelCase (createdAt, entityType)
- Input types: PascalCase with Input suffix (CreateEntityInput)
- Enums: PascalCase with UPPER_SNAKE_CASE values
