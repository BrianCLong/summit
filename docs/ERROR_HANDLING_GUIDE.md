# Error Handling & Resilience Patterns Guide

> **Last Updated**: 2025-11-20
> **Audience**: Summit Platform Developers
> **Prerequisites**: Familiarity with TypeScript, Express, GraphQL

## Table of Contents

1. [Overview](#overview)
2. [Error Handling Philosophy](#error-handling-philosophy)
3. [Standardized Error System](#standardized-error-system)
4. [Resilience Patterns](#resilience-patterns)
5. [Integration Guidelines](#integration-guidelines)
6. [Common Scenarios](#common-scenarios)
7. [Monitoring & Observability](#monitoring--observability)
8. [Migration Guide](#migration-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Summit platform implements a comprehensive, standardized error handling and resilience system that provides:

- **Consistency**: All services use the same error codes and response formats
- **Reliability**: Circuit breakers, retries, and timeouts prevent cascading failures
- **Observability**: Structured logging, trace IDs, and metrics for debugging
- **Developer Experience**: Easy-to-use APIs with sensible defaults

### Key Components

```
@intelgraph/error-handling
├── Error Codes Catalog        → 50+ standardized error codes
├── Error Classes              → Type-safe error hierarchy
├── Express Middleware         → Automatic error handling
├── GraphQL Error Formatter    → Consistent GraphQL errors
├── Circuit Breaker            → Failure detection & recovery
├── Retry Logic                → Exponential backoff
├── Timeout Protection         → Prevent hanging operations
└── Graceful Degradation       → Handle non-critical failures
```

---

## Error Handling Philosophy

### 1. Fail Fast, Recover Gracefully

```typescript
// ✅ Good: Fail fast with clear error
if (!userId) {
  throw new ValidationError('User ID is required', { field: 'userId' });
}

// ❌ Bad: Silent failure
if (!userId) {
  logger.warn('User ID missing');
  return null;
}
```

### 2. Distinguish Operational vs Programming Errors

**Operational Errors** (expected, handle gracefully):
- Validation failures
- Authentication failures
- External service unavailable
- Database connection timeout

**Programming Errors** (bugs, crash and fix):
- `null` reference errors
- Type errors
- Assertion failures

```typescript
import { isOperationalError } from '@intelgraph/error-handling';

try {
  await operation();
} catch (error) {
  if (isOperationalError(error)) {
    // Handle gracefully
    logger.warn({ error }, 'Operational error occurred');
    return fallbackValue;
  } else {
    // Programming error - re-throw
    logger.error({ error }, 'Programming error - requires fix');
    throw error;
  }
}
```

### 3. Provide Context, Not Just Messages

```typescript
// ✅ Good: Rich context for debugging
throw new DatabaseError(
  'POSTGRES_ERROR',
  'User query failed',
  {
    query: sql.substring(0, 100),
    userId,
    duration: queryDuration,
    retryAttempt: 2,
  },
  originalError
);

// ❌ Bad: Generic message
throw new Error('Database error');
```

### 4. Use Appropriate Resilience Patterns

| Scenario | Pattern | Reason |
|----------|---------|--------|
| External API call | Circuit Breaker + Retry + Timeout | Prevent cascading failures |
| Database query | Retry + Timeout | Transient failures common |
| Cache (Redis) | Graceful Degradation | Non-critical, should not break app |
| Policy Engine (OPA) | Circuit Breaker + Fallback | Critical but needs graceful failure |
| Analytics/Logging | Graceful Degradation | Optional feature |

---

## Standardized Error System

### Error Code Categories

#### Client Errors (4xx)

```typescript
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '@intelgraph/error-handling';

// 400 - Validation error
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: email,
  expected: 'valid email address',
});

// 401 - Authentication error
throw new AuthenticationError('AUTH_TOKEN_EXPIRED',
  'Your session has expired',
  { tokenAge: tokenAge }
);

// 403 - Authorization error
throw new AuthorizationError('INSUFFICIENT_PERMISSIONS',
  'Admin role required',
  { userId, requiredRole: 'admin', userRoles }
);

// 404 - Not found
throw new NotFoundError('Investigation', { id: investigationId });

// 409 - Conflict
throw new ConflictError('Investigation name already exists', {
  name: investigationName,
  existingId: existing.id,
});

// 429 - Rate limit
throw new RateLimitError(60, { limit: 100, current: 101 });
```

#### Server Errors (5xx)

```typescript
import {
  InternalError,
  DatabaseError,
  ExternalServiceError,
  TimeoutError,
  CircuitBreakerError,
  ServiceUnavailableError,
} from '@intelgraph/error-handling';

// 500 - Internal error
throw new InternalError('Unexpected error during processing', {
  operation: 'calculateScore',
}, originalError);

// 500/503 - Database error
throw new DatabaseError('POSTGRES_ERROR',
  'Connection pool exhausted',
  { poolSize: 20, activeConnections: 20 }
);

// 502 - External service error
throw new ExternalServiceError('OPA_ERROR',
  'opa',
  'Policy engine returned 500',
  { responseStatus: 500 }
);

// 504 - Timeout
throw new TimeoutError('database.query', 5000, {
  query: sql.substring(0, 50),
});

// 503 - Circuit breaker
throw new CircuitBreakerError('payment-gateway', {
  state: 'open',
  failures: 5,
});

// 503 - Service unavailable
throw new ServiceUnavailableError('System maintenance in progress');
```

### Error Response Format

All errors return consistent JSON:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid email format",
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-20T10:30:00.000Z",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "expected": "valid email address"
    },
    "path": "/api/users",
    "requestId": "req-abc-123"
  }
}
```

**Key Fields:**
- `code`: Machine-readable error code
- `message`: Human-readable description
- `traceId`: Unique ID for error tracking (generated automatically)
- `timestamp`: When error occurred
- `details`: Additional context (object)
- `path`: API endpoint where error occurred
- `requestId`: Request correlation ID

---

## Resilience Patterns

### 1. Circuit Breaker

**Purpose**: Prevent cascading failures by "opening" after repeated failures

```typescript
import { executeWithCircuitBreaker } from '@intelgraph/error-handling';

const result = await executeWithCircuitBreaker(
  'payment-gateway',
  async () => {
    const response = await fetch(paymentGatewayUrl, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
    return response.json();
  },
  {
    failureThreshold: 5,     // Open after 5 failures
    successThreshold: 2,     // Close after 2 successes in half-open
    timeout: 30000,          // Try half-open after 30s
    monitoringPeriod: 60000, // Track failures over 60s window
  }
);
```

**States:**
- **Closed** (normal): Requests pass through
- **Open** (failing): Requests immediately fail with `CircuitBreakerError`
- **Half-Open** (testing): Allow limited requests to test recovery

**When to Use:**
- External API calls (payment, email, SMS)
- Downstream microservices
- Third-party integrations

**Monitoring:**
```typescript
import { getCircuitBreakerMetrics } from '@intelgraph/error-handling';

const metrics = getCircuitBreakerMetrics();
// {
//   'payment-gateway': { state: 'closed', failureCount: 0, successCount: 10 },
//   'email-service': { state: 'open', failureCount: 5, successCount: 0 }
// }
```

### 2. Retry with Exponential Backoff

**Purpose**: Automatically retry transient failures with increasing delays

```typescript
import { executeWithRetry, RetryPolicies } from '@intelgraph/error-handling';

// Use pre-configured policy
const data = await executeWithRetry(
  () => database.query('SELECT * FROM users'),
  RetryPolicies.database
);

// Custom policy
const result = await executeWithRetry(
  () => apiClient.fetchData(),
  {
    maxRetries: 4,
    initialDelay: 2000,      // Start with 2s
    maxDelay: 30000,         // Cap at 30s
    backoffMultiplier: 2,    // 2s → 4s → 8s → 16s → 30s
    retryableErrors: [       // Only retry these errors
      'OPERATION_TIMEOUT',
      'SERVICE_UNAVAILABLE',
    ],
  }
);
```

**Pre-configured Policies:**

| Policy | Max Retries | Initial Delay | Max Delay | Use Case |
|--------|-------------|---------------|-----------|----------|
| `default` | 3 | 1000ms | 10000ms | General operations |
| `database` | 3 | 500ms | 5000ms | DB queries |
| `externalService` | 4 | 2000ms | 30000ms | API calls |
| `quick` | 2 | 100ms | 1000ms | Fast operations |
| `none` | 0 | - | - | No retry |

**Backoff Calculation:**
```
Attempt 1: initialDelay = 1000ms
Attempt 2: 1000ms * 2 = 2000ms
Attempt 3: 2000ms * 2 = 4000ms
Attempt 4: 4000ms * 2 = 8000ms (capped at maxDelay)
```

### 3. Timeout Protection

**Purpose**: Prevent operations from hanging indefinitely

```typescript
import { executeWithTimeout } from '@intelgraph/error-handling';

const result = await executeWithTimeout(
  async () => {
    return await longRunningOperation();
  },
  5000, // 5 second timeout
  'longRunningOperation'
);

// If operation takes > 5s, throws TimeoutError:
// {
//   code: 'OPERATION_TIMEOUT',
//   message: 'longRunningOperation timed out after 5000ms',
//   ...
// }
```

**Recommended Timeouts:**

| Operation Type | Timeout | Rationale |
|---------------|---------|-----------|
| Database query | 5-10s | Slow queries indicate index issues |
| External API | 10-30s | Network latency + processing |
| Policy decision (OPA) | 2-5s | Should be fast, critical path |
| File upload | 60-300s | Depends on file size |
| Background job | No timeout | Use job queue timeout instead |

### 4. Graceful Degradation

**Purpose**: Handle non-critical failures without breaking the application

```typescript
import { withGracefulDegradation } from '@intelgraph/error-handling';

// Non-critical feature
const recommendations = await withGracefulDegradation(
  () => recommendationService.getRecommendations(userId),
  [], // Fallback to empty array
  {
    serviceName: 'recommendations',
    operation: 'getRecommendations',
    logError: true,
  }
);

// App continues even if recommendations fail
res.json({
  user,
  investigations,
  recommendations, // Will be [] if service failed
});
```

**Use Cases:**
- Analytics/tracking
- Recommendations
- Caching (Redis)
- Non-critical enrichment
- Audit logging (for reads)

### 5. Combined Resilience

**Purpose**: Apply multiple patterns for maximum reliability

```typescript
import { executeWithResilience, RetryPolicies } from '@intelgraph/error-handling';

const result = await executeWithResilience({
  serviceName: 'payment-gateway',
  operation: 'processPayment',
  fn: () => paymentGateway.charge(amount, cardToken),

  // Retry configuration
  retryPolicy: {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },

  // Timeout configuration
  timeoutMs: 30000,

  // Circuit breaker configuration
  circuitBreakerConfig: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    monitoringPeriod: 120000,
  },
});

// Execution flow:
// 1. Check circuit breaker (fail fast if open)
// 2. Execute with timeout wrapper
// 3. If fails, retry with exponential backoff
// 4. Update circuit breaker state based on result
```

---

## Integration Guidelines

### Express Applications

#### 1. Add Middleware

```typescript
// server/src/app.ts
import express from 'express';
import {
  correlationIdMiddleware,
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from '@intelgraph/error-handling';

const app = express();

// 1. Add correlation ID middleware FIRST
app.use(correlationIdMiddleware);

// 2. Your routes (use asyncHandler)
app.get('/api/entities/:id', asyncHandler(async (req, res) => {
  const entity = await entityService.findById(req.params.id);

  if (!entity) {
    throw new NotFoundError('Entity', { id: req.params.id });
  }

  res.json(entity);
}));

// 3. Add 404 handler
app.use(notFoundHandler);

// 4. Add error handler LAST
app.use(errorHandler);
```

#### 2. Use asyncHandler

```typescript
import { asyncHandler } from '@intelgraph/error-handling';

// ✅ Good: Errors automatically caught
app.post('/api/investigations', asyncHandler(async (req, res) => {
  const investigation = await investigationService.create(req.body);
  res.status(201).json(investigation);
}));

// ❌ Bad: Manual try/catch needed
app.post('/api/investigations', async (req, res) => {
  try {
    const investigation = await investigationService.create(req.body);
    res.status(201).json(investigation);
  } catch (error) {
    // Have to handle error manually
    res.status(500).json({ error: error.message });
  }
});
```

### GraphQL Applications

#### 1. Configure Error Formatter

```typescript
// services/api/src/app.ts
import { ApolloServer } from '@apollo/server';
import { createGraphQLErrorFormatter } from '@intelgraph/error-handling';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: createGraphQLErrorFormatter(),
});
```

#### 2. Throw Errors in Resolvers

```typescript
import { NotFoundError, AuthorizationError } from '@intelgraph/error-handling';

const resolvers = {
  Query: {
    entity: async (parent, { id }, context) => {
      // Authorization
      if (!context.user) {
        throw new AuthenticationError('AUTH_TOKEN_MISSING',
          'Authentication required'
        );
      }

      // Fetch entity
      const entity = await entityService.findById(id);

      if (!entity) {
        throw new NotFoundError('Entity', { id });
      }

      return entity;
    },
  },

  Mutation: {
    createInvestigation: async (parent, { input }, context) => {
      // Validate
      if (!input.name) {
        throw new ValidationError('Investigation name is required', {
          field: 'name',
        });
      }

      // Create
      return investigationService.create(input);
    },
  },
};
```

#### 3. GraphQL Error Response

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "locations": [{"line": 2, "column": 3}],
      "path": ["entity"],
      "extensions": {
        "code": "RESOURCE_NOT_FOUND",
        "traceId": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2025-11-20T10:30:00.000Z",
        "httpStatus": 404,
        "details": {
          "id": "123"
        }
      }
    }
  ],
  "data": null
}
```

### Database Integration

#### Neo4j

```typescript
import { executeNeo4jQuery } from '@intelgraph/error-handling';

export class EntityRepository {
  constructor(private driver: any) {}

  async findById(id: string) {
    return executeNeo4jQuery(
      'findEntityById',
      async () => {
        const session = this.driver.session();
        try {
          const result = await session.run(
            'MATCH (e:Entity {id: $id}) RETURN e',
            { id }
          );
          return result.records[0]?.get('e').properties;
        } finally {
          await session.close();
        }
      },
      { timeoutMs: 5000 }
    );
  }
}
```

#### PostgreSQL

```typescript
import { executePostgresQuery } from '@intelgraph/error-handling';

export class UserRepository {
  constructor(private pool: any) {}

  async findById(id: string) {
    return executePostgresQuery(
      'findUserById',
      async () => {
        const result = await this.pool.query(
          'SELECT * FROM users WHERE id = $1',
          [id]
        );
        return result.rows[0];
      },
      { timeoutMs: 3000 }
    );
  }
}
```

#### Redis

```typescript
import { executeRedisOperation } from '@intelgraph/error-handling';

export class CacheService {
  constructor(private redis: any) {}

  async get<T>(key: string): Promise<T | null> {
    return executeRedisOperation(
      'get',
      async () => {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      },
      null // Fallback to null if Redis fails
    );
  }
}
```

### External Service Integration

#### OPA Policy Engine

```typescript
import { executeWithResilience, RetryPolicies } from '@intelgraph/error-handling';

export class PolicyService {
  async authorize(input: any): Promise<boolean> {
    const decision = await executeWithResilience({
      serviceName: 'opa',
      operation: 'authorize',
      fn: () => this.makeOPARequest(input),
      retryPolicy: RetryPolicies.externalService,
      timeoutMs: 5000,
      circuitBreakerConfig: {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 15000,
        monitoringPeriod: 30000,
      },
    });

    return decision.allow;
  }

  private async makeOPARequest(input: any) {
    const response = await fetch(`${this.opaUrl}/v1/data/authz/allow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new ExternalServiceError('OPA_ERROR',
        'opa',
        `OPA returned ${response.status}`
      );
    }

    return response.json();
  }
}
```

---

## Common Scenarios

### Scenario 1: User Registration

```typescript
import {
  ValidationError,
  ConflictError,
  DatabaseError,
  asyncHandler,
} from '@intelgraph/error-handling';

app.post('/api/users/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  // 1. Validate input
  if (!email || !isValidEmail(email)) {
    throw new ValidationError('Invalid email format', {
      field: 'email',
      value: email,
    });
  }

  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters', {
      field: 'password',
      minLength: 8,
    });
  }

  // 2. Check for existing user
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new ConflictError('Email already registered', {
      email,
      existingUserId: existing.id,
    });
  }

  // 3. Create user (database operation has retry built-in)
  const user = await userRepo.create({ email, password, name });

  // 4. Send welcome email (graceful degradation)
  await withGracefulDegradation(
    () => emailService.sendWelcome(email, name),
    null,
    { serviceName: 'email', operation: 'sendWelcome' }
  );

  res.status(201).json({ user });
}));
```

### Scenario 2: Payment Processing

```typescript
import {
  executeWithResilience,
  RetryPolicies,
  ValidationError,
  ExternalServiceError,
} from '@intelgraph/error-handling';

async function processPayment(amount: number, cardToken: string) {
  // 1. Validate
  if (amount <= 0) {
    throw new ValidationError('Amount must be positive', {
      field: 'amount',
      value: amount,
    });
  }

  // 2. Process with full resilience
  const result = await executeWithResilience({
    serviceName: 'payment-gateway',
    operation: 'charge',
    fn: async () => {
      const response = await fetch(paymentGatewayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, cardToken }),
      });

      if (!response.ok) {
        throw new ExternalServiceError('EXTERNAL_SERVICE_ERROR',
          'payment-gateway',
          `Payment failed: ${response.status}`
        );
      }

      return response.json();
    },
    retryPolicy: RetryPolicies.externalService,
    timeoutMs: 30000,
    circuitBreakerConfig: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000,
      monitoringPeriod: 120000,
    },
  });

  return result;
}
```

### Scenario 3: Complex GraphQL Query

```typescript
import {
  NotFoundError,
  AuthorizationError,
  executeOptional,
} from '@intelgraph/error-handling';

const resolvers = {
  Query: {
    investigation: async (parent, { id }, context) => {
      // 1. Check authentication
      if (!context.user) {
        throw new AuthenticationError();
      }

      // 2. Fetch investigation
      const investigation = await investigationRepo.findById(id);
      if (!investigation) {
        throw new NotFoundError('Investigation', { id });
      }

      // 3. Check authorization
      const canAccess = await policyService.authorize({
        user: context.user,
        resource: { type: 'investigation', id },
        action: 'read',
      });

      if (!canAccess) {
        throw new AuthorizationError('INSUFFICIENT_PERMISSIONS',
          'Cannot access this investigation'
        );
      }

      // 4. Fetch related entities (critical)
      investigation.entities = await entityRepo.findByInvestigation(id);

      // 5. Fetch analytics (optional - graceful degradation)
      investigation.analytics = await executeOptional(
        () => analyticsService.getStats(id),
        { serviceName: 'analytics', operation: 'getStats' }
      ) || { views: 0, lastUpdated: null };

      return investigation;
    },
  },
};
```

---

## Monitoring & Observability

### 1. Structured Logging

All errors are logged with structured context:

```typescript
{
  "level": "error",
  "time": "2025-11-20T10:30:00.000Z",
  "name": "ErrorMiddleware",
  "error": {
    "code": "DATABASE_QUERY_FAILED",
    "message": "PostgreSQL query failed",
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "httpStatus": 500,
    "retryable": true,
    "details": {
      "query": "SELECT * FROM users WHERE ...",
      "duration": 5234
    }
  },
  "request": {
    "method": "GET",
    "url": "/api/users/123",
    "correlationId": "req-abc-123"
  }
}
```

### 2. Circuit Breaker Metrics

```typescript
import { getCircuitBreakerMetrics, getHealthStatus } from '@intelgraph/error-handling';

// Add to health check endpoint
app.get('/health/detailed', (req, res) => {
  const circuitBreakers = getCircuitBreakerMetrics();
  const health = getHealthStatus();

  res.json({
    status: health.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    circuitBreakers,
  });
});
```

**Prometheus Metrics** (add to your metrics collector):

```typescript
// Example metrics to expose
const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
});

const circuitBreakerFailuresCounter = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total circuit breaker failures',
  labelNames: ['service'],
});
```

### 3. Trace IDs for Debugging

Every error has a unique `traceId`:

```typescript
// Client receives
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An internal error occurred",
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}

// Search logs for trace ID
// grep "550e8400-e29b-41d4-a716-446655440000" logs/*.log

// Or query log aggregation system
// Splunk: traceId="550e8400-e29b-41d4-a716-446655440000"
// Elasticsearch: { "query": { "term": { "traceId": "..." } } }
```

### 4. Alerting

Set up alerts for:

**Critical**:
- Circuit breaker opened (indicates service degradation)
- Error rate > 5% for 5 minutes
- Specific error codes: `DATABASE_CONNECTION_FAILED`, `CIRCUIT_BREAKER_OPEN`

**Warning**:
- Retry exhaustion rate increasing
- Timeout errors increasing
- Error rate > 1% for 15 minutes

**Example Prometheus Alert**:

```yaml
groups:
  - name: error_handling
    rules:
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{service="payment-gateway"} == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker open for {{ $labels.service }}"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
```

---

## Migration Guide

### Phase 1: Add Middleware (Low Risk)

1. Install package:
   ```bash
   pnpm add @intelgraph/error-handling --filter <your-service>
   ```

2. Add middleware to Express app:
   ```typescript
   import { errorHandler, notFoundHandler, correlationIdMiddleware } from '@intelgraph/error-handling';

   app.use(correlationIdMiddleware);
   // ... your routes
   app.use(notFoundHandler);
   app.use(errorHandler);
   ```

3. Add GraphQL formatter:
   ```typescript
   import { createGraphQLErrorFormatter } from '@intelgraph/error-handling';

   const server = new ApolloServer({
     formatError: createGraphQLErrorFormatter(),
   });
   ```

### Phase 2: Replace Error Classes (Medium Risk)

Replace custom errors with standard errors:

```typescript
// Before
throw new Error('User not found');

// After
import { NotFoundError } from '@intelgraph/error-handling';
throw new NotFoundError('User', { id: userId });
```

### Phase 3: Add Resilience Patterns (High Value)

Identify critical external dependencies and add resilience:

```typescript
// Before
const decision = await fetch(opaUrl, { ... });

// After
import { executeWithResilience } from '@intelgraph/error-handling';
const decision = await executeWithResilience({
  serviceName: 'opa',
  operation: 'authorize',
  fn: () => fetch(opaUrl, { ... }),
  ...
});
```

### Phase 4: Update Database Clients (Medium Risk)

Wrap database operations:

```typescript
// Before
const result = await db.query(sql, params);

// After
import { executePostgresQuery } from '@intelgraph/error-handling';
const result = await executePostgresQuery(
  'operation-name',
  () => db.query(sql, params)
);
```

---

## Troubleshooting

### Issue: Circuit Breaker Stuck Open

**Symptoms**: All requests to a service immediately fail with `CIRCUIT_BREAKER_OPEN`

**Diagnosis**:
```typescript
import { getCircuitBreakerMetrics } from '@intelgraph/error-handling';
console.log(getCircuitBreakerMetrics());
// { 'my-service': { state: 'open', failureCount: 5, successCount: 0 } }
```

**Solutions**:
1. Check if downstream service is actually healthy
2. Manually reset circuit breaker (testing only):
   ```typescript
   import { resetAllCircuitBreakers } from '@intelgraph/error-handling';
   resetAllCircuitBreakers();
   ```
3. Adjust configuration (if too sensitive):
   ```typescript
   circuitBreakerConfig: {
     failureThreshold: 10, // Increase threshold
     timeout: 60000,       // Increase recovery timeout
   }
   ```

### Issue: Too Many Retries

**Symptoms**: Operations taking very long due to excessive retries

**Diagnosis**: Check logs for retry attempts

**Solutions**:
1. Reduce max retries:
   ```typescript
   retryPolicy: { maxRetries: 2 }
   ```
2. Use specific retryable errors:
   ```typescript
   retryPolicy: {
     retryableErrors: ['OPERATION_TIMEOUT'], // Don't retry validation errors
   }
   ```
3. Use `RetryPolicies.quick` for fast operations

### Issue: Errors Not Being Caught

**Symptoms**: Unhandled promise rejections, app crashes

**Solutions**:
1. Ensure `asyncHandler` wraps all async routes:
   ```typescript
   app.get('/api/users', asyncHandler(async (req, res) => { ... }));
   ```
2. Ensure error middleware is LAST:
   ```typescript
   app.use(errorHandler); // Must be last
   ```
3. Check for `.catch()` that swallows errors

### Issue: Production Errors Too Generic

**Symptoms**: Clients see "An internal error occurred" for everything

**Expected**: This is intentional for 5xx errors in production

**Solutions**:
1. Use appropriate error types (4xx errors show details)
2. Check server logs using `traceId` for debugging
3. For debugging, temporarily set `NODE_ENV=development`

---

## Best Practices Checklist

### Development
- [ ] Use `asyncHandler` for all Express async routes
- [ ] Throw specific error types (`ValidationError`, `NotFoundError`, etc.)
- [ ] Include context in error details
- [ ] Add graceful degradation for non-critical features
- [ ] Use circuit breakers for external services
- [ ] Add retries for database operations
- [ ] Set appropriate timeouts

### Error Messages
- [ ] User-facing messages are clear and actionable
- [ ] No sensitive information in error messages
- [ ] Include field names in validation errors
- [ ] Provide trace IDs for support

### Testing
- [ ] Test error paths, not just happy paths
- [ ] Test circuit breaker behavior
- [ ] Test retry exhaustion scenarios
- [ ] Test timeout behavior
- [ ] Reset circuit breakers in test setup

### Monitoring
- [ ] Log all errors with structured logging
- [ ] Include correlation IDs in logs
- [ ] Monitor circuit breaker states
- [ ] Set up alerts for critical errors
- [ ] Track error rates by code

### Documentation
- [ ] Document expected error responses in API docs
- [ ] Document retry behavior for clients
- [ ] Document timeout values
- [ ] Document circuit breaker thresholds

---

## Additional Resources

- [Error Codes Catalog](../packages/error-handling/src/error-codes.ts)
- [Error Handling Package README](../packages/error-handling/README.md)
- [OPA Client Example](../packages/error-handling/src/examples/opa-client.ts)
- [Database Client Examples](../packages/error-handling/src/examples/database-clients.ts)
- [Orchestration Package](../packages/orchestration/src/index.ts)

---

## Feedback

This guide is a living document. If you encounter scenarios not covered here or have suggestions for improvements, please:

1. Create an issue in the repository
2. Submit a pull request with updates
3. Discuss in the #engineering Slack channel

**Last Updated**: 2025-11-20
