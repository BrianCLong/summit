# Config Service

Centralized configuration, feature flags, and experimentation service for the IntelGraph platform.

## Features

- **Configuration Management**: Hierarchical config resolution (global → environment → tenant → user)
- **Feature Flags**: Boolean and multivariate flags with targeting rules and rollout controls
- **Experimentation**: A/B testing with consistent bucket assignment and sticky bucketing
- **Segments**: Reusable user segments for targeting
- **Multi-tenant**: Full tenant isolation with shared global defaults
- **Observability**: Prometheus metrics, audit logging, distributed tracing
- **Caching**: Redis-based caching with pub/sub invalidation

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- pnpm

### Installation

```bash
cd services/config-service
pnpm install
```

### Configuration

Set environment variables or create a `.env` file:

```bash
# Database
CONFIG_DB_HOST=localhost
CONFIG_DB_PORT=5432
CONFIG_DB_NAME=intelgraph_config
CONFIG_DB_USER=intelgraph
CONFIG_DB_PASSWORD=devpassword

# Redis
CONFIG_REDIS_HOST=localhost
CONFIG_REDIS_PORT=6379
CONFIG_REDIS_PASSWORD=

# Server
PORT=4100
NODE_ENV=development
CORS_ORIGIN=*
```

### Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## API

### GraphQL Endpoint

`POST /graphql`

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks database connections)
- `GET /health/live` - Liveness probe

### Metrics

`GET /metrics` - Prometheus metrics

## Usage Examples

### Configuration

```graphql
# Get a config value
query {
  configValue(
    key: "feature.rate_limit"
    context: { tenantId: "tenant-1", environment: "production" }
  )
}

# Set a config value
mutation {
  createConfig(
    input: {
      key: "feature.rate_limit"
      value: 1000
      valueType: integer
      level: tenant
      tenantId: "tenant-1"
    }
  ) {
    id
    key
    value
  }
}
```

### Feature Flags

```graphql
# Evaluate a flag
query {
  evaluateFlag(
    flagKey: "new-dashboard"
    context: { userId: "user-123", tenantId: "tenant-1" }
  ) {
    enabled
    value
    reason
  }
}

# Create a flag with targeting
mutation {
  createFlag(
    input: {
      key: "new-dashboard"
      name: "New Dashboard"
      enabled: true
      defaultValue: false
      valueType: boolean
    }
  ) {
    id
    key
  }
}
```

### Experiments

```graphql
# Get experiment assignment
query {
  getExperimentAssignment(
    experimentKey: "checkout-flow-v2"
    context: { userId: "user-123", tenantId: "tenant-1" }
  ) {
    variantName
    value
    inExperiment
    reason
  }
}

# Create an experiment
mutation {
  createExperiment(
    input: {
      key: "checkout-flow-v2"
      name: "Checkout Flow V2"
      variants: [
        { name: "control", weight: 50, value: { version: 1 }, isControl: true }
        {
          name: "treatment"
          weight: 50
          value: { version: 2 }
          isControl: false
        }
      ]
      rolloutPercentage: 100
    }
  ) {
    id
    key
    status
  }
}

# Start the experiment
mutation {
  startExperiment(id: "experiment-id") {
    status
    startedAt
  }
}
```

## Client SDK

### Installation

```typescript
import { createConfigClient } from '@intelgraph/config-service/sdk';

const client = createConfigClient({
  baseUrl: 'http://localhost:4100',
  apiKey: 'your-api-key',
  tenantId: 'tenant-1',
  environment: 'production',
  enableCache: true,
  cacheTtlMs: 60000,
});
```

### Usage

```typescript
// Get config value
const limit = await client.getConfig<number>('feature.rate_limit', {}, 100);

// Check feature flag
const isEnabled = await client.isFeatureEnabled(
  'new-dashboard',
  { userId: 'user-123' },
  false,
);

// Get experiment assignment
const assignment = await client.getExperimentAssignment('checkout-flow-v2', {
  userId: 'user-123',
});

if (assignment.inExperiment) {
  console.log(`User in variant: ${assignment.variantName}`);
}

// Batch evaluation
const results = await client.batchEvaluate(
  { userId: 'user-123' },
  {
    flagKeys: ['flag-a', 'flag-b'],
    experimentKeys: ['exp-1'],
    configKeys: ['config-a'],
  },
);
```

## Architecture

### Config Hierarchy

Configuration values are resolved in the following order (highest to lowest priority):

1. **User** - User-specific overrides
2. **Tenant** - Tenant-specific configuration
3. **Environment** - Environment-specific (staging, production)
4. **Global** - Default values

### Feature Flag Evaluation

1. Check if flag exists and is enabled
2. Check blocklist (return default if blocked)
3. Check allowlist (return enabled if allowed)
4. Evaluate targeting rules in priority order
5. Apply rollout percentage
6. Return matched rule value or default

### Experiment Assignment

1. Check if experiment is running
2. Check blocklist/allowlist
3. Evaluate target segment (if configured)
4. Check rollout percentage
5. Check for existing sticky assignment
6. Assign to variant using consistent hashing
7. Record assignment for sticky bucketing

## Governance

### Protected Configs

Configs and flags can be marked as `isGovernanceProtected` to prevent:

- Deletion
- Removal of governance protection
- Experimentation without approval

### Experiment Approval

Experiments can require approval before starting:

```graphql
mutation {
  createExperiment(
    input: {
      key: "sensitive-experiment"
      name: "Sensitive Experiment"
      requiresApproval: true
      isGovernanceProtected: true
      variants: [...]
    }
  ) {
    id
    requiresApproval
  }
}

# Approve before starting
mutation {
  approveExperiment(id: "experiment-id") {
    approvedBy
    approvedAt
  }
}
```

## Metrics

The service exposes Prometheus metrics at `/metrics`:

- `config_service_config_evaluations_total` - Config evaluation count
- `config_service_flag_evaluations_total` - Flag evaluation count
- `config_service_experiment_assignments_total` - Experiment assignments
- `config_service_cache_hits_total` - Cache hits
- `config_service_cache_misses_total` - Cache misses
- `config_service_api_request_duration_ms` - API latency

## Audit Logging

All changes are logged to the `config_audit_log` table:

```graphql
query {
  auditLog(entityType: "flag", entityId: "flag-id", limit: 10) {
    entries {
      action
      previousValue
      newValue
      userId
      timestamp
    }
    total
  }
}
```

## Development

### Project Structure

```
src/
├── api/           # GraphQL schema and resolvers
├── db/            # Database connections and repositories
│   └── repositories/
├── services/      # Business logic
├── sdk/           # Client SDK
├── types/         # TypeScript types and Zod schemas
├── utils/         # Utilities (hash, logger, metrics)
└── __tests__/     # Tests
```

### Adding New Features

1. Define types in `src/types/index.ts`
2. Add repository methods in `src/db/repositories/`
3. Implement business logic in `src/services/`
4. Add GraphQL schema and resolvers
5. Write tests
6. Update documentation

## License

Internal use only - IntelGraph Platform
