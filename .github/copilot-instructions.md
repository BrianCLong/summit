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
