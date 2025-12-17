# Golden Paths: Common Developer Workflows

> **Purpose**: Step-by-step guides for common development tasks.
> **Principle**: Every path should be completable in under 30 minutes.

---

## Table of Contents

1. [I want to add a new service](#1-i-want-to-add-a-new-service)
2. [I want to add a new API endpoint](#2-i-want-to-add-a-new-api-endpoint)
3. [I want to modify the database schema](#3-i-want-to-modify-the-database-schema)
4. [I want to add a new UI component](#4-i-want-to-add-a-new-ui-component)
5. [I want to debug a failing test](#5-i-want-to-debug-a-failing-test)
6. [I want to investigate a production issue](#6-i-want-to-investigate-a-production-issue)
7. [I want to add observability to my code](#7-i-want-to-add-observability-to-my-code)
8. [I want to add a new feature flag](#8-i-want-to-add-a-new-feature-flag)
9. [I want to update dependencies](#9-i-want-to-update-dependencies)
10. [I want to write an integration test](#10-i-want-to-write-an-integration-test)

---

## 1. I want to add a new service

**Time**: ~20 minutes
**Prerequisites**: `make up` running

### Step 1: Scaffold the service

```bash
# Use the CompanyOS CLI
pnpm companyos:new-service --name my-service --port 4050 --owner my-team

# Or use the golden path template
cp -r templates/golden-path-service services/my-service
cd services/my-service
```

### Step 2: Configure the service

Edit `services/my-service/service.yaml`:
```yaml
service: my-service
owner: my-team
description: Description of what this service does

runtime:
  language: node
  port: 4050
  job_label: my_service

deploy:
  helm_chart: charts/my-service

slo_profile: companyos-default
```

### Step 3: Add to workspace

Edit `pnpm-workspace.yaml` (if not auto-detected):
```yaml
packages:
  - 'services/*'  # Should already include services
```

### Step 4: Install dependencies

```bash
cd services/my-service
pnpm install
```

### Step 5: Add to Docker Compose (optional)

Edit `docker-compose.dev.yml`:
```yaml
services:
  my-service:
    build:
      context: ./services/my-service
      dockerfile: Dockerfile
    container_name: summit-my-service
    ports:
      - '4050:4050'
    environment:
      PORT: 4050
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:4050/health']
    networks:
      - summit
```

### Step 6: Verify

```bash
# Start service locally
cd services/my-service
pnpm dev

# Test health endpoint
curl http://localhost:4050/health

# Run smoke tests
make smoke
```

### Checklist
- [ ] Service scaffolded with correct structure
- [ ] Health endpoint responds
- [ ] CI workflow created (`.github/workflows/my-service.yml`)
- [ ] SLO configuration generated
- [ ] ADR documented

---

## 2. I want to add a new API endpoint

**Time**: ~15 minutes
**Prerequisites**: `make up` running

### Step 1: Define GraphQL schema

Edit `server/src/graphql/schema/` or service schema:

```graphql
# server/src/graphql/schema/myFeature.graphql
type MyEntity {
  id: ID!
  name: String!
  createdAt: DateTime!
}

extend type Query {
  myEntity(id: ID!): MyEntity
  myEntities(limit: Int = 10): [MyEntity!]!
}

extend type Mutation {
  createMyEntity(input: CreateMyEntityInput!): MyEntity!
}

input CreateMyEntityInput {
  name: String!
}
```

### Step 2: Implement resolver

Create `server/src/graphql/resolvers/myFeature.ts`:

```typescript
import { MyEntityService } from '../../services/myEntityService';

export const myFeatureResolvers = {
  Query: {
    myEntity: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      await context.authorize('myEntity:read');
      return MyEntityService.findById(id);
    },
    myEntities: async (_parent: unknown, { limit }: { limit: number }, context: GraphQLContext) => {
      await context.authorize('myEntity:read');
      return MyEntityService.findAll({ limit });
    },
  },
  Mutation: {
    createMyEntity: async (_parent: unknown, { input }: { input: CreateMyEntityInput }, context: GraphQLContext) => {
      await context.authorize('myEntity:write');
      return MyEntityService.create(input);
    },
  },
};
```

### Step 3: Register resolver

Edit `server/src/graphql/resolvers/index.ts`:

```typescript
import { myFeatureResolvers } from './myFeature';

export const resolvers = merge(
  // ... existing resolvers
  myFeatureResolvers,
);
```

### Step 4: Add tests

Create `server/src/graphql/resolvers/__tests__/myFeature.test.ts`:

```typescript
import { createTestClient } from 'apollo-server-testing';

describe('MyFeature Resolvers', () => {
  it('should create entity', async () => {
    const { mutate } = createTestClient(server);
    const result = await mutate({
      mutation: CREATE_MY_ENTITY,
      variables: { input: { name: 'Test' } },
    });
    expect(result.data.createMyEntity).toHaveProperty('id');
  });
});
```

### Step 5: Verify

```bash
# Regenerate types (if using codegen)
pnpm graphql:codegen

# Run tests
pnpm test:api

# Test in playground
open http://localhost:4000/graphql
```

### Checklist
- [ ] Schema defined with proper types
- [ ] Resolver implemented with auth checks
- [ ] Tests written and passing
- [ ] Types regenerated

---

## 3. I want to modify the database schema

**Time**: ~20 minutes
**Prerequisites**: `make up` running

### For PostgreSQL (Prisma)

#### Step 1: Modify schema

Edit `prisma/schema.prisma`:

```prisma
model MyEntity {
  id        String   @id @default(uuid())
  name      String
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
}
```

#### Step 2: Create migration

```bash
# Generate migration
pnpm db:pg:migrate dev --name add_my_entity_table

# View migration SQL (optional)
cat prisma/migrations/*/migration.sql
```

#### Step 3: Apply and verify

```bash
# Apply migration
pnpm db:pg:migrate

# Generate client
pnpm db:pg:generate

# Verify
pnpm db:pg:status
```

### For Neo4j

#### Step 1: Create migration script

Create `server/db/migrations/neo4j/V003__add_my_entity.cypher`:

```cypher
// Create constraint
CREATE CONSTRAINT my_entity_id IF NOT EXISTS
FOR (n:MyEntity) REQUIRE n.id IS UNIQUE;

// Create index
CREATE INDEX my_entity_status IF NOT EXISTS
FOR (n:MyEntity) ON (n.status);
```

#### Step 2: Apply migration

```bash
pnpm db:neo4j:migrate
```

#### Step 3: Verify in Neo4j Browser

```cypher
// Check constraints
SHOW CONSTRAINTS;

// Check indexes
SHOW INDEXES;
```

### Checklist
- [ ] Migration file created
- [ ] Migration applied successfully
- [ ] Rollback tested (if destructive)
- [ ] Client types regenerated
- [ ] Smoke tests pass

---

## 4. I want to add a new UI component

**Time**: ~15 minutes
**Prerequisites**: Frontend running (`pnpm dev` or `make up`)

### Step 1: Create component

Create `client/src/components/MyComponent/MyComponent.tsx`:

```tsx
import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6">{title}</Typography>
      {onAction && (
        <Button variant="contained" onClick={onAction}>
          Action
        </Button>
      )}
    </Box>
  );
};

export default MyComponent;
```

### Step 2: Create index export

Create `client/src/components/MyComponent/index.ts`:

```typescript
export { MyComponent } from './MyComponent';
export type { MyComponentProps } from './MyComponent';
```

### Step 3: Add tests

Create `client/src/components/MyComponent/MyComponent.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onAction when button clicked', () => {
    const handleAction = jest.fn();
    render(<MyComponent title="Test" onAction={handleAction} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleAction).toHaveBeenCalled();
  });
});
```

### Step 4: Add Storybook story (optional)

Create `client/src/components/MyComponent/MyComponent.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
};

export default meta;

export const Default: StoryObj<typeof MyComponent> = {
  args: {
    title: 'Example Title',
  },
};

export const WithAction: StoryObj<typeof MyComponent> = {
  args: {
    title: 'With Action',
    onAction: () => alert('Clicked!'),
  },
};
```

### Step 5: Verify

```bash
# Run tests
pnpm test:client

# Check in browser (hot reload)
# Navigate to where you use the component
```

### Checklist
- [ ] Component created with TypeScript types
- [ ] Index file exports component
- [ ] Tests written and passing
- [ ] Storybook story created (if applicable)
- [ ] Component displays correctly in browser

---

## 5. I want to debug a failing test

**Time**: ~10-30 minutes

### Step 1: Run with verbose output

```bash
# Run specific test with verbose
pnpm test -- --verbose path/to/test.ts

# Run in watch mode
pnpm test:watch path/to/test.ts
```

### Step 2: Add debugging

```typescript
// Add console.log or debugger statements
it('should do something', async () => {
  console.log('Input:', input);
  debugger; // Pauses in Node inspector
  const result = await myFunction(input);
  console.log('Result:', result);
  expect(result).toBe(expected);
});
```

### Step 3: Run with debugger

```bash
# Run with Node inspector
pnpm test:debug path/to/test.ts

# Then open Chrome DevTools: chrome://inspect
```

### Step 4: Isolate the test

```typescript
// Run only this test
it.only('should do something', async () => {
  // ...
});

// Skip problematic tests temporarily
it.skip('broken test', () => {
  // ...
});
```

### Step 5: Check for async issues

```typescript
// Ensure proper async handling
it('async test', async () => {
  // Use await
  const result = await asyncFunction();

  // Or use done callback
  asyncFunction().then(result => {
    expect(result).toBe(expected);
    done();
  });
});
```

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Timeout | Missing await | Add `await` to async calls |
| Random failures | Shared state | Use `beforeEach` to reset |
| "Not found" | Missing mock | Add mock for external dependency |
| Type errors | Outdated types | Run `pnpm typecheck` |

---

## 6. I want to investigate a production issue

**Time**: Varies

### Step 1: Check dashboards

```bash
# Start observability stack if not running
summit up --profile observability

# Open dashboards
open http://localhost:3001  # Grafana
open http://localhost:16686 # Jaeger
open http://localhost:9090  # Prometheus
```

### Step 2: Search logs

```bash
# View API logs
summit logs api --since 1h

# Search for errors
summit logs api | grep -i error

# In Grafana Explore, use LogQL:
# {job="summit_api"} |= "error"
```

### Step 3: Find traces

In Jaeger (localhost:16686):
1. Select service: `summit-api`
2. Set time range
3. Search for operation or tags
4. Click trace to see span details

### Step 4: Check metrics

In Prometheus (localhost:9090):
```promql
# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Latency p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Active connections
neo4j_active_connections
```

### Step 5: Reproduce locally

```bash
# Get production-like data
pnpm devkit:seed

# Enable debug logging
DEBUG=summit:* pnpm dev

# Hit the same endpoint
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ investigation(id: \"xxx\") { id } }"}'
```

---

## 7. I want to add observability to my code

**Time**: ~10 minutes

### Logging

```typescript
import { logger } from '../utils/logger';

// Structured logging
logger.info({ investigationId, userId }, 'Investigation created');
logger.error({ err, context }, 'Failed to process request');

// With request context (auto-propagated)
req.log.info('Processing request');
```

### Metrics

```typescript
import { metrics } from '../telemetry';

// Counter
const requestsTotal = metrics.createCounter('my_requests_total', {
  description: 'Total requests processed',
  labelNames: ['status', 'method'],
});
requestsTotal.inc({ status: 'success', method: 'GET' });

// Histogram
const requestDuration = metrics.createHistogram('my_request_duration_seconds', {
  description: 'Request duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});
const timer = requestDuration.startTimer();
// ... do work
timer({ status: 'success' });

// Gauge
const activeJobs = metrics.createGauge('my_active_jobs', {
  description: 'Currently active jobs',
});
activeJobs.inc();
// ... job completes
activeJobs.dec();
```

### Tracing

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function myFunction() {
  return tracer.startActiveSpan('myFunction', async (span) => {
    try {
      span.setAttribute('custom.attribute', 'value');
      const result = await doWork();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 8. I want to add a new feature flag

**Time**: ~5 minutes

### Step 1: Add to environment

Edit `.env.example`:
```bash
# Feature Flags
FEATURE_MY_NEW_FEATURE=false
```

### Step 2: Add type definition

Edit `server/src/config/featureFlags.ts`:
```typescript
export const featureFlags = {
  // ... existing flags
  MY_NEW_FEATURE: process.env.FEATURE_MY_NEW_FEATURE === 'true',
};
```

### Step 3: Use in code

```typescript
import { featureFlags } from '../config/featureFlags';

if (featureFlags.MY_NEW_FEATURE) {
  // New behavior
} else {
  // Old behavior
}
```

### Step 4: Test both paths

```typescript
describe('with MY_NEW_FEATURE enabled', () => {
  beforeEach(() => {
    jest.spyOn(featureFlags, 'MY_NEW_FEATURE', 'get').mockReturnValue(true);
  });

  it('should use new behavior', () => {
    // ...
  });
});
```

---

## 9. I want to update dependencies

**Time**: ~15-30 minutes

### Step 1: Check for updates

```bash
# See outdated packages
pnpm outdated

# Security audit
pnpm audit
```

### Step 2: Update strategically

```bash
# Update patch versions (safe)
pnpm update

# Update specific package
pnpm update typescript

# Update to latest (may have breaking changes)
pnpm update typescript@latest
```

### Step 3: Test thoroughly

```bash
# Full test suite
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Smoke tests
make smoke
```

### Step 4: Check for breaking changes

```bash
# Review changelog of updated packages
# Check package's GitHub releases page
# Search for migration guides
```

### Checklist
- [ ] No security vulnerabilities (`pnpm audit`)
- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] Smoke tests pass
- [ ] Changelog reviewed for breaking changes

---

## 10. I want to write an integration test

**Time**: ~20 minutes

### Step 1: Create test file

Create `tests/integration/myFeature.integration.test.ts`:

```typescript
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { createTestClient } from '../helpers/graphql';

describe('MyFeature Integration', () => {
  let client: TestClient;

  beforeAll(async () => {
    await setupTestDatabase();
    client = await createTestClient();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await client.resetData();
  });

  it('should create entity and retrieve it', async () => {
    // Create
    const createResult = await client.mutate({
      mutation: CREATE_ENTITY,
      variables: { input: { name: 'Test Entity' } },
    });
    const entityId = createResult.data.createEntity.id;

    // Retrieve
    const getResult = await client.query({
      query: GET_ENTITY,
      variables: { id: entityId },
    });

    expect(getResult.data.entity).toMatchObject({
      id: entityId,
      name: 'Test Entity',
    });
  });

  it('should handle errors gracefully', async () => {
    const result = await client.query({
      query: GET_ENTITY,
      variables: { id: 'non-existent' },
    });

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('not found');
  });
});
```

### Step 2: Run integration tests

```bash
# Ensure services running
make up

# Run integration tests
pnpm test:integration

# Run specific test
pnpm test:integration -- myFeature
```

### Step 3: Add to CI

Integration tests run automatically in CI with the full stack.

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Start dev environment | `make up` |
| Stop environment | `make down` |
| Run all tests | `pnpm test` |
| Run smoke tests | `make smoke` |
| View logs | `summit logs api` |
| Create service | `pnpm companyos:new-service --name x` |
| DB migration | `pnpm db:pg:migrate` |
| Regenerate types | `pnpm graphql:codegen` |
| Check for updates | `pnpm outdated` |
| Full CI locally | `pnpm ci` |
