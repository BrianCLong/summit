# GraphQL Concurrency Controls

This document describes the request-throttling controls that protect the `/graphql` endpoint from unbounded concurrent execution.

## Middleware Overview

- Middleware: `createGraphQLConcurrencyMiddleware` (Express).
- Purpose: Enforces a per-user cap on the number of in-flight GraphQL requests.
- Scope: Automatically mounted on `/graphql` in both the primary API server (`src/app.ts`) and the live demo server (`src/live-server.ts`).
- Failure mode: If Redis is unavailable the middleware fails open (logs a warning and allows the request).

When the active request count for a user exceeds the configured limit the middleware returns HTTP `429 Too Many Requests` with a `Retry-After: 1` header and JSON body:

```json
{
  "error": "too_many_requests",
  "message": "Concurrent GraphQL limit of <limit> exceeded"
}
```

Counts are tracked in Redis with a short TTL to garbage-collect stuck entries if a process crashes before releasing.

## Configuration

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `GRAPHQL_CONCURRENCY_DEFAULT_LIMIT` | Global maximum number of concurrent GraphQL requests permitted per user. | `5` |
| `GRAPHQL_CONCURRENCY_TTL_SECONDS` | TTL applied to active request counters to recover from crashed workers. | `120` |

### Redis Keys

| Key Pattern | Purpose |
| --- | --- |
| `graphql:throttle:limit:<userId>` | Optional per-user override for the concurrency limit. |
| `graphql:throttle:limit:default` | Persisted default limit when overridden via GraphQL. |
| `graphql:throttle:active:<userId>` | Current number of in-flight requests for the user. |

## GraphQL API

Three admin-only mutations and two queries manage the throttle configuration. All values are persisted in Redis so that changes apply across all API instances.

### Query `graphqlConcurrencyStatus`

Returns the effective limit, active count, and override status for a user.

```graphql
query GraphQLConcurrencyStatus($userId: ID!) {
  graphqlConcurrencyStatus(userId: $userId) {
    userId
    limit
    active
    hasCustomLimit
    defaultLimit
  }
}
```

### Query `graphqlConcurrencyDefaults`

Returns the default concurrent request limit currently in force.

```graphql
query GraphQLConcurrencyDefaults {
  graphqlConcurrencyDefaults {
    defaultLimit
  }
}
```

### Mutation `setGraphQLConcurrencyLimit`

Sets a custom limit (must be ≥ 1) for a user and returns the updated status.

```graphql
mutation SetGraphQLConcurrencyLimit($userId: ID!, $limit: Int!) {
  setGraphQLConcurrencyLimit(userId: $userId, limit: $limit) {
    userId
    limit
    hasCustomLimit
    active
    defaultLimit
  }
}
```

### Mutation `clearGraphQLConcurrencyLimit`

Removes a custom limit for a user so the default applies.

```graphql
mutation ClearGraphQLConcurrencyLimit($userId: ID!) {
  clearGraphQLConcurrencyLimit(userId: $userId) {
    userId
    limit
    hasCustomLimit
    defaultLimit
  }
}
```

### Mutation `setGraphQLConcurrencyDefault`

Persists a new default limit that applies to all users without overrides.

```graphql
mutation SetGraphQLConcurrencyDefault($limit: Int!) {
  setGraphQLConcurrencyDefault(limit: $limit) {
    defaultLimit
  }
}
```

All mutations require an authenticated admin context (`role: ADMIN`).

## Testing

Targeted Jest tests validate the service, middleware, and resolvers:

- `src/services/__tests__/graphqlConcurrencyService.test.ts`
- `src/middleware/__tests__/graphqlConcurrency.test.ts`
- `src/graphql/resolvers/__tests__/graphqlConcurrency.test.ts`

Run the suite with:

```bash
cd server && npm test -- --runTestsByPath \
  src/services/__tests__/graphqlConcurrencyService.test.ts \
  src/middleware/__tests__/graphqlConcurrency.test.ts \
  src/graphql/resolvers/__tests__/graphqlConcurrency.test.ts
```
