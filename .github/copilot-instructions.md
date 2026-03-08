# GitHub Copilot Instructions for Summit/IntelGraph

This file provides custom instructions for GitHub Copilot when working in this repository.

## Project Context

Summit/IntelGraph is an intelligence analysis platform with AI-augmented graph analytics. It's a
pnpm workspace monorepo managed by Turbo with 150+ services.

## Code Style

- Use TypeScript with ES2022 target and ESNext modules
- Single quotes, semicolons, trailing commas
- 2-space indentation, 80 character line width
- camelCase for files, PascalCase for React components
- Import order: external deps, @intelgraph/\*, relative imports

## Conventions

When generating code:

- Prefer functional React components over class components
- Use TypeScript interfaces for data contracts
- Handle errors with try/catch, return error objects
- Use proper logging (Winston/Pino), not console.log
- GraphQL: PascalCase for types, camelCase for fields
- Database: snake_case for columns, camelCase in JS/TS

## Testing

- Tests use Jest with SWC transformer
- Name test files `*.test.ts` or `*.spec.ts`
- Use Arrange/Act/Assert pattern
- Never use `.only()` or `.skip()` in committed code
- Mock external services in unit tests

## Security

- Never include secrets, credentials, or API keys
- Use environment variables for configuration
- Validate all user inputs
- Check authorization before data access

## Package Manager

Always use pnpm commands, never npm or yarn:

- `pnpm install` not `npm install`
- `pnpm add <pkg>` not `npm install <pkg>`
- `pnpm --filter @intelgraph/api add <pkg>` for workspace packages

## Common Patterns

### GraphQL Resolver

```typescript
export const resolvers = {
  Query: {
    entity: async (_parent, { id }, context) => {
      await context.authorize('entity:read');
      return entityService.findById(id);
    },
  },
};
```

### React Component

```typescript
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface Props {
  entity: { id: string; name: string; type: string };
}

export const EntityCard: React.FC<Props> = ({ entity }) => (
  <Card>
    <CardContent>
      <Typography variant="h5">{entity.name}</Typography>
      <Typography color="textSecondary">{entity.type}</Typography>
    </CardContent>
  </Card>
);
```

### Service Function

```typescript
export async function createEntity(data: CreateEntityInput): Promise<Entity> {
  const validated = entitySchema.parse(data);
  const entity = await db.entity.create({ data: validated });
  await auditLog.record('entity:created', entity.id);
  return entity;
}
```

## Commit Messages

Use Conventional Commits format:

- `feat(scope): description` for new features
- `fix(scope): description` for bug fixes
- `docs(scope): description` for documentation
- `refactor(scope): description` for refactoring
- `test(scope): description` for tests

## Key Technologies

- Backend: Node.js 18+, Express, Apollo Server, GraphQL
- Databases: Neo4j 5.x, PostgreSQL 15+, Redis
- Frontend: React 18+, Apollo Client, Material-UI, Vite
- Auth: OIDC/JWKS, OPA for RBAC+ABAC
- Observability: OpenTelemetry, Prometheus, Grafana

## Summit-Style Copilot CLI Workflow (Terminal-Native)

This repository heavily leverages the GitHub Copilot CLI for terminal-native agentic development. Follow these guidelines when generating code or managing Pull Requests via the CLI.

### 1. Plan Mode Enforcement

For complex changes (e.g., multi-file refactors, new features, architecture changes), you must use Copilot CLI's plan mode to structure the approach before writing code.

- **Prompt Example:** `/plan Implement provenance ledger hashing for ingestion pipeline. Requirements: Add SHA-256 hashing for artifacts, Store hash in Neo4j node metadata, Add verification CLI command, Include tests.`

### 2. PR-First Agent Workflows

The primary unit of work is a reviewable Pull Request. Copilot should focus on orchestrating cohesive, multi-file changes (code, tests, config, docs) rather than just single snippets.

- **Requirement:** Ensure all changes are committed to a logical branch before opening a PR.

### 3. Explicit PR Context

When drafting a PR description (or instructing Copilot to do so), you must include:

- **Scope:** What specific files/modules are touched?
- **Acceptance Criteria:** How do we know this change works?
- **Calculated Risk Score:** Reference the PR Risk Scoring Model (`docs/governance/PR_RISK_SCORING.md`) for automated diff summarization.

### 4. Tool Permissions & Safe Execution

To maintain governance, adhere to these operational boundaries within the CLI:

- **Git Commands:** Allowed for branch creation, committing, and PR submission.
- **NPM/PNPM Scripts:** Allowed for running tests (`pnpm test`), linting (`pnpm lint`), and building. Do not use `npm` or `yarn`.
- **File Writes:** Allowed within the scope of the plan. Do not modify core governance policies (`SECURITY.md`, `AGENTS.md`) without explicit instruction.
