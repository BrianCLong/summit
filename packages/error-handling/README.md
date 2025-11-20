# @intelgraph/error-handling

Standardized error handling and resilience patterns for the Summit platform.

## Features

- **Standardized Error Codes**: Comprehensive catalog of error codes across all categories
- **Consistent Error Responses**: Unified error response format for HTTP and GraphQL
- **Circuit Breaker Pattern**: Automatic failure detection and recovery for external services
- **Retry Logic**: Exponential backoff with configurable policies
- **Timeout Protection**: Prevent operations from hanging indefinitely
- **Graceful Degradation**: Handle non-critical failures without breaking the application
- **Express & GraphQL Middleware**: Ready-to-use error handling middleware
- **Database Wrappers**: Resilient database clients with retry and timeout

## Installation

This package is part of the Summit monorepo workspace.

```bash
pnpm add @intelgraph/error-handling
```

## Quick Start

### 1. Express Application

```typescript
import express from 'express';
import {
  errorHandler,
  notFoundHandler,
  correlationIdMiddleware,
  asyncHandler,
} from '@intelgraph/error-handling';

const app = express();

// Add correlation ID middleware
app.use(correlationIdMiddleware);

// Your routes using asyncHandler
app.get('/api/entities/:id', asyncHandler(async (req, res) => {
  const entity = await entityService.findById(req.params.id);

  if (!entity) {
    throw new NotFoundError('Entity');
  }

  res.json(entity);
}));

// Add 404 handler before error handler
app.use(notFoundHandler);

// Add error handler as last middleware
app.use(errorHandler);
```

### 2. GraphQL Application

```typescript
import { ApolloServer } from '@apollo/server';
import { createGraphQLErrorFormatter } from '@intelgraph/error-handling';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: createGraphQLErrorFormatter(),
});
```

### 3. Using Standard Errors

```typescript
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
} from '@intelgraph/error-handling';

// Validation error
if (!data.name) {
  throw new ValidationError('Name is required', {
    field: 'name',
    value: data.name,
  });
}

// Not found error
const user = await userRepo.findById(id);
if (!user) {
  throw new NotFoundError('User', { id });
}

// Authorization error
if (!user.hasPermission('admin')) {
  throw new AuthorizationError('INSUFFICIENT_PERMISSIONS',
    'Admin permission required',
    { userId: user.id, permission: 'admin' }
  );
}

// Database error
try {
  await db.query(sql);
} catch (error) {
  throw new DatabaseError('POSTGRES_ERROR',
    'Query failed',
    { sql },
    error
  );
}
```

### 4. Circuit Breaker Pattern

```typescript
import { executeWithCircuitBreaker } from '@intelgraph/error-handling';

// External API call with circuit breaker
const result = await executeWithCircuitBreaker(
  'external-api',
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    monitoringPeriod: 60000,
  }
);
```

### 5. Retry Logic

```typescript
import { executeWithRetry, RetryPolicies } from '@intelgraph/error-handling';

// Database query with retry
const data = await executeWithRetry(
  () => db.query('SELECT * FROM users'),
  RetryPolicies.database
);

// External service with custom retry policy
const result = await executeWithRetry(
  () => apiClient.fetchData(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }
);
```

### 6. Graceful Degradation

```typescript
import { withGracefulDegradation } from '@intelgraph/error-handling';

// Optional feature that shouldn't break the app
const recommendations = await withGracefulDegradation(
  () => recommendationService.getRecommendations(userId),
  [], // Fallback to empty array
  {
    serviceName: 'recommendations',
    operation: 'getRecommendations',
  }
);
```

### 7. Full Resilience Stack

```typescript
import { executeWithResilience, RetryPolicies } from '@intelgraph/error-handling';

// Combine circuit breaker + retry + timeout
const result = await executeWithResilience({
  serviceName: 'payment-gateway',
  operation: 'processPayment',
  fn: () => paymentGateway.charge(amount, card),
  retryPolicy: RetryPolicies.externalService,
  timeoutMs: 30000,
  circuitBreakerConfig: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000,
    monitoringPeriod: 30000,
  },
});
```

## Error Codes Catalog

### Client Errors (4xx)

| Code | HTTP Status | Description | Retryable |
|------|-------------|-------------|-----------|
| `VALIDATION_FAILED` | 400 | Request validation failed | No |
| `INVALID_INPUT` | 400 | Invalid input provided | No |
| `AUTH_TOKEN_MISSING` | 401 | Authentication token missing | No |
| `AUTH_TOKEN_EXPIRED` | 401 | Token has expired | No |
| `FORBIDDEN` | 403 | Access forbidden | No |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions | No |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found | No |
| `RESOURCE_CONFLICT` | 409 | Resource conflict | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded | Yes |

### Server Errors (5xx)

| Code | HTTP Status | Description | Retryable |
|------|-------------|-------------|-----------|
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error | No |
| `DATABASE_QUERY_FAILED` | 500 | Database query failed | Yes |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable | Yes |
| `CIRCUIT_BREAKER_OPEN` | 503 | Circuit breaker open | Yes |
| `OPERATION_TIMEOUT` | 504 | Operation timeout | Yes |
| `GATEWAY_TIMEOUT` | 504 | Gateway timeout | Yes |

See [error-codes.ts](./src/error-codes.ts) for the complete catalog.

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Entity not found",
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-20T10:30:00.000Z",
    "details": {
      "id": "123",
      "type": "entity"
    },
    "path": "/api/entities/123",
    "requestId": "req-abc-123"
  }
}
```

## Retry Policies

Pre-configured retry policies for common scenarios:

### Default Policy
- Max retries: 3
- Initial delay: 1000ms
- Max delay: 10000ms
- Backoff: Exponential (2x)

### Database Policy
- Max retries: 3
- Initial delay: 500ms
- Max delay: 5000ms
- Retryable errors: Connection failures, timeouts

### External Service Policy
- Max retries: 4
- Initial delay: 2000ms
- Max delay: 30000ms
- Retryable errors: Timeouts, service unavailable

### Quick Policy
- Max retries: 2
- Initial delay: 100ms
- Max delay: 1000ms

## Database Wrappers

### Neo4j

```typescript
import { ResilientNeo4jClient } from '@intelgraph/error-handling/examples/database-clients';

const neo4jClient = new ResilientNeo4jClient(driver);

// Query with timeout and retry
const entities = await neo4jClient.query(
  'MATCH (e:Entity {id: $id}) RETURN e',
  { id: entityId },
  { timeoutMs: 5000 }
);
```

### PostgreSQL

```typescript
import { ResilientPostgresClient } from '@intelgraph/error-handling/examples/database-clients';

const pgClient = new ResilientPostgresClient(pool);

// Query with resilience
const users = await pgClient.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Transaction with auto-rollback
await pgClient.transaction(async (client) => {
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
});
```

### Redis

```typescript
import { ResilientRedisClient } from '@intelgraph/error-handling/examples/database-clients';

const redisClient = new ResilientRedisClient(redis);

// Operations with graceful degradation
const cached = await redisClient.get('key'); // Returns null if Redis fails
await redisClient.set('key', value, 3600); // Logs error but doesn't throw
```

## External Service Clients

### OPA Policy Engine

```typescript
import { createOPAClient } from '@intelgraph/error-handling/examples/opa-client';

const opaClient = createOPAClient();

// Authorization with circuit breaker and retry
await opaClient.authorize({
  user: { id: userId, roles: ['admin'] },
  resource: { type: 'entity', id: entityId },
  action: 'read',
});

// With graceful degradation (fails closed)
const decision = await opaClient.decideWithFallback({
  user: { id: userId, roles: ['user'] },
  resource: { type: 'investigation' },
  action: 'create',
});
```

## Circuit Breaker Monitoring

```typescript
import {
  getCircuitBreakerMetrics,
  getHealthStatus,
  resetAllCircuitBreakers,
} from '@intelgraph/error-handling';

// Get all circuit breaker metrics
const metrics = getCircuitBreakerMetrics();
console.log(metrics);
// {
//   'opa': { state: 'closed', failureCount: 0, successCount: 5 },
//   'payment-gateway': { state: 'open', failureCount: 5, successCount: 0 }
// }

// Get health status
const health = getHealthStatus();
console.log(health);
// {
//   healthy: false,
//   details: {
//     circuitBreakers: { ... }
//   }
// }

// Reset all circuit breakers (testing/recovery)
resetAllCircuitBreakers();
```

## Best Practices

### 1. Use Appropriate Error Types

```typescript
// ✅ Good - specific error type
throw new NotFoundError('User', { id: userId });

// ❌ Bad - generic error
throw new Error('User not found');
```

### 2. Include Context in Errors

```typescript
// ✅ Good - detailed context
throw new DatabaseError('POSTGRES_ERROR',
  'Query failed',
  {
    query: sql.substring(0, 100),
    params: queryParams,
    duration: queryDuration
  },
  originalError
);

// ❌ Bad - no context
throw new DatabaseError('POSTGRES_ERROR', 'Query failed');
```

### 3. Use asyncHandler for Express Routes

```typescript
// ✅ Good - automatic error handling
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));

// ❌ Bad - manual try/catch
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Apply Graceful Degradation for Non-Critical Features

```typescript
// ✅ Good - app continues if analytics fail
const analytics = await withGracefulDegradation(
  () => analyticsService.track(event),
  null,
  { serviceName: 'analytics', operation: 'track' }
);

// ❌ Bad - app breaks if analytics fail
const analytics = await analyticsService.track(event);
```

### 5. Configure Circuit Breakers per Service

```typescript
// ✅ Good - service-specific configuration
const paymentResult = await executeWithCircuitBreaker(
  'payment-gateway',
  () => paymentGateway.charge(amount),
  {
    failureThreshold: 3,  // Strict for payments
    timeout: 15000,       // Quick recovery
  }
);

const analyticsResult = await executeWithCircuitBreaker(
  'analytics',
  () => analyticsService.send(data),
  {
    failureThreshold: 10, // Lenient for analytics
    timeout: 60000,       // Slower recovery
  }
);
```

## Testing

```typescript
import { resetAllCircuitBreakers } from '@intelgraph/error-handling';

describe('Service Tests', () => {
  beforeEach(() => {
    // Reset circuit breakers between tests
    resetAllCircuitBreakers();
  });

  it('should handle errors correctly', async () => {
    // Your tests
  });
});
```

## Migration Guide

### From Old Error Handling

```typescript
// Before
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// After
import { errorHandler } from '@intelgraph/error-handling';
app.use(errorHandler);
```

### From Direct Database Calls

```typescript
// Before
const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);

// After
import { executePostgresQuery } from '@intelgraph/error-handling';
const result = await executePostgresQuery(
  'findUserById',
  () => db.query('SELECT * FROM users WHERE id = $1', [id])
);
```

### From Direct External API Calls

```typescript
// Before
const response = await fetch(apiUrl);
const data = await response.json();

// After
import { executeWithResilience, RetryPolicies } from '@intelgraph/error-handling';
const data = await executeWithResilience({
  serviceName: 'external-api',
  operation: 'fetchData',
  fn: async () => {
    const response = await fetch(apiUrl);
    return response.json();
  },
  retryPolicy: RetryPolicies.externalService,
  timeoutMs: 10000,
});
```

## API Reference

See source files for complete API documentation:

- [Error Codes](./src/error-codes.ts) - Complete error code catalog
- [Errors](./src/errors.ts) - Error classes and utilities
- [Middleware](./src/middleware.ts) - Express and GraphQL middleware
- [Resilience](./src/resilience.ts) - Circuit breaker, retry, timeout patterns
- [Database](./src/database.ts) - Database operation wrappers

## Contributing

When adding new error codes:

1. Add to `ErrorCodes` in `error-codes.ts`
2. Include HTTP status mapping
3. Mark as retryable or not
4. Update this README
5. Add tests

## License

PROPRIETARY - Summit Platform
