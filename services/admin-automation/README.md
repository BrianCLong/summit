# @intelgraph/admin-automation

AI-driven digital bureaucracy reduction service targeting **70% workload reduction** for citizens and staff.

## Features

- **Citizen Profile Aggregation**: Reuse submitted information across forms ("submit once, use everywhere")
- **Form Auto-complete**: Pre-fill forms from citizen profiles with 30+ standard field mappings
- **Proactive Service Resolution**: Predict and auto-resolve service needs before they arise
- **Workload Metrics**: Track automation effectiveness against 70% reduction target

## Quick Start

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
pnpm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /health/ready` | Readiness probe |
| `GET /health/live` | Liveness probe |
| `GET /metrics` | Service metrics |
| `POST /graphql` | GraphQL API |

## GraphQL API

### Queries

```graphql
# Get citizen profile
query {
  citizenProfile(id: "uuid") {
    id
    personal { firstName lastName }
    contact { email phone }
  }
}

# Auto-complete form fields
query {
  autocompleteForm(citizenId: "uuid", fields: [
    { id: "f1", name: "firstName", type: "text", required: true }
  ]) {
    values
    completionRate
  }
}

# Check workload target
query {
  workloadTargetStatus {
    met
    currentReduction
    target
  }
}
```

### Mutations

```graphql
# Handle form submission
mutation {
  handleFormSubmission(
    citizenId: "uuid"
    formId: "form-123"
    data: [{ key: "firstName", value: "John" }]
  ) {
    profileUpdated
    newNeedsDetected
    autoResolved
  }
}

# Auto-resolve predicted need
mutation {
  autoResolveServiceNeed(needId: "uuid", citizenId: "uuid") {
    resolved
    action
    nextSteps
  }
}
```

## Architecture

```
src/
├── graphql/
│   ├── schema.ts      # GraphQL type definitions
│   ├── resolvers.ts   # Query/Mutation handlers
│   └── context.ts     # Request context setup
├── citizen-profile-aggregator.ts  # Profile data aggregation
├── form-autocomplete.ts           # Form field auto-fill
├── proactive-service-resolver.ts  # Need prediction/resolution
├── workflow-automation.ts         # Orchestration layer
├── metrics.ts                     # Workload tracking
├── cache.ts                       # LRU cache for performance
├── errors.ts                      # Custom error types
├── repository.ts                  # Data persistence interfaces
├── config.ts                      # Configuration
└── server.ts                      # Express + Apollo server
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4010 | Server port |
| `NODE_ENV` | development | Environment |
| `CACHE_MAX_SIZE` | 1000 | Max cached profiles |
| `CACHE_TTL_SECONDS` | 300 | Cache TTL (5 min) |

## Workload Reduction Calculation

The 70% target is measured by:

```
reduction = (autoCompleted + reusedData + proactiveResolutions) / totalWork * 100
```

Where:
- **autoCompleted**: Fields filled from profile
- **reusedData**: Data points reused across forms
- **proactiveResolutions**: Needs resolved before citizen request
- **totalWork**: All work including manual interventions

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## License

Proprietary - IntelGraph Platform
