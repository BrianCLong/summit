# Logging Best Practices and Debugging Workflows

## Table of Contents

1. [Introduction](#introduction)
2. [Logging Standards](#logging-standards)
3. [What to Log](#what-to-log)
4. [What NOT to Log](#what-not-to-log)
5. [Log Levels](#log-levels)
6. [Structured Logging](#structured-logging)
7. [Correlation and Tracing](#correlation-and-tracing)
8. [Performance Considerations](#performance-considerations)
9. [Debugging Workflows](#debugging-workflows)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

## Introduction

This document provides comprehensive guidelines for logging and debugging in the IntelGraph platform. Following these practices ensures:

- **Consistency**: Uniform logging across all services
- **Debuggability**: Easy troubleshooting and root cause analysis
- **Performance**: Minimal impact on application performance
- **Compliance**: Meeting security and audit requirements
- **Cost Efficiency**: Optimal storage and query costs

## Logging Standards

### Use the Standardized Logger

Always use `@intelgraph/logger` package:

```typescript
import { initializeLogger, logger } from '@intelgraph/logger';

// Initialize once at startup
initializeLogger({
  serviceName: 'my-service',
  level: 'info',
  loki: process.env.NODE_ENV === 'production',
});

// Use throughout the application
logger.info('User logged in', { userId: '123', method: 'oauth' });
```

### Log Format

All logs must be in JSON format with these required fields:

```json
{
  "timestamp": "2025-11-20T10:30:45.123Z",
  "level": "info",
  "message": "Human-readable message",
  "service": "service-name",
  "correlationId": "uuid",
  "traceId": "opentelemetry-trace-id",
  "spanId": "opentelemetry-span-id"
}
```

## What to Log

### ✅ DO Log

#### 1. Application Lifecycle Events

```typescript
logger.info('Application starting', {
  version: process.env.APP_VERSION,
  environment: process.env.NODE_ENV,
  nodeVersion: process.version,
});

logger.info('Application ready', {
  port: 3000,
  uptime: process.uptime(),
});

logger.info('Application shutting down', {
  reason: 'SIGTERM received',
});
```

#### 2. Authentication and Authorization

```typescript
logger.info('User login attempt', {
  userId: user.id,
  method: 'oauth',
  provider: 'google',
});

logger.warn('Failed login attempt', {
  username: username,
  reason: 'invalid_password',
  ip: req.ip,
});

logger.logSecurityEvent('UNAUTHORIZED_ACCESS', 'high', {
  userId: req.user?.id,
  resource: '/admin/users',
  action: 'DELETE',
});
```

#### 3. Business Operations

```typescript
logger.info('Investigation created', {
  investigationId: investigation.id,
  createdBy: user.id,
  type: investigation.type,
});

logger.info('Entity added to graph', {
  entityId: entity.id,
  type: entity.type,
  investigationId: investigation.id,
});
```

#### 4. External Service Calls

```typescript
logger.info('Calling external API', {
  service: 'user-service',
  method: 'GET',
  url: '/api/users/123',
});

logger.error('External API call failed', error, {
  service: 'user-service',
  url: '/api/users/123',
  statusCode: 500,
  retryAttempt: 3,
});
```

#### 5. Database Operations

```typescript
logger.debug('Database query started', {
  query: 'getUserById',
  userId: '123',
});

logger.logQuery('getUserById', 45, true, {
  userId: '123',
  rowsReturned: 1,
});
```

#### 6. Errors and Exceptions

```typescript
logger.error('Failed to process request', error, {
  userId: req.user?.id,
  path: req.path,
  method: req.method,
});

logger.error('Unhandled exception', error, {
  stack: error.stack,
  context: { /* relevant context */ },
});
```

#### 7. Performance Metrics

```typescript
logger.logPerformance('calculateGraphAnalytics', duration, {
  nodeCount: 1000,
  edgeCount: 5000,
  algorithm: 'pagerank',
});
```

#### 8. Configuration Changes

```typescript
logger.warn('Configuration changed', {
  setting: 'max_connections',
  oldValue: 100,
  newValue: 200,
  changedBy: user.id,
});
```

## What NOT to Log

### ❌ DO NOT Log

#### 1. Sensitive Data

```typescript
// ❌ BAD
logger.info('User data', {
  username: 'john',
  password: 'secret123',  // NEVER log passwords
  ssn: '123-45-6789',     // NEVER log PII
  creditCard: '4111...',  // NEVER log payment data
});

// ✅ GOOD
logger.info('User authentication successful', {
  userId: user.id,  // Use IDs instead
  method: 'password',
});
```

#### 2. Large Payloads

```typescript
// ❌ BAD
logger.debug('API response', {
  data: hugeArrayWith10000Items,  // Too large
  fullDocument: entireMongoDocument,
});

// ✅ GOOD
logger.debug('API response received', {
  itemCount: hugeArray.length,
  documentId: document._id,
  size: JSON.stringify(data).length,
});
```

#### 3. Secrets and Tokens

```typescript
// ❌ BAD
logger.debug('HTTP request', {
  headers: {
    authorization: 'Bearer eyJhbGc...',  // NEVER
    'x-api-key': 'secret-key',           // NEVER
  },
});

// ✅ GOOD - Automatic redaction
// The logger automatically redacts these fields
logger.debug('HTTP request sent', {
  method: 'POST',
  url: '/api/resource',
  hasAuth: !!headers.authorization,
});
```

#### 4. High-Frequency Debug Logs in Production

```typescript
// ❌ BAD - In tight loop
for (const item of millionItems) {
  logger.debug('Processing item', { item });  // Too many logs!
}

// ✅ GOOD - Sample or aggregate
logger.debug('Processing batch', {
  itemCount: millionItems.length,
  firstItem: millionItems[0],
});

// Sample 1% of items
if (Math.random() < 0.01) {
  logger.debug('Sample item', { item });
}
```

## Log Levels

### Level Guidelines

```typescript
// ERROR - Something failed and requires immediate attention
logger.error('Failed to save user data', error, {
  userId: user.id,
  operation: 'save',
});

// WARN - Something unexpected but handled
logger.warn('Rate limit approaching', {
  current: 950,
  limit: 1000,
  user: user.id,
});

// INFO - Important business events (default production level)
logger.info('Payment processed', {
  orderId: order.id,
  amount: payment.amount,
  currency: 'USD',
});

// HTTP - HTTP request/response logging
logger.http('Request completed', {
  method: 'POST',
  path: '/api/orders',
  statusCode: 201,
  duration: 156,
});

// DEBUG - Detailed debugging information
logger.debug('Cache miss', {
  key: cacheKey,
  ttl: 3600,
});

// SILLY - Very detailed debugging (rarely used)
logger.silly('Internal state', {
  internalVariable: value,
});
```

### Environment-Specific Levels

```javascript
// Development
LOG_LEVEL=debug

// Staging
LOG_LEVEL=info

// Production
LOG_LEVEL=info  // or warn for high-traffic services
```

## Structured Logging

### Always Use Structured Data

```typescript
// ❌ BAD - String interpolation
logger.info(`User ${userId} performed action ${action}`);

// ✅ GOOD - Structured data
logger.info('User action', {
  userId,
  action,
  timestamp: Date.now(),
});
```

### Benefits of Structured Logging

1. **Queryable**: Easy to search in Loki/Grafana
2. **Parseable**: Machines can understand and aggregate
3. **Consistent**: Same format across all services
4. **Filterable**: Can filter by specific fields

### LogQL Query Examples

```logql
# Find all errors for a specific user
{service="api-service"} | json | level="error" | userId="user-123"

# Find slow database queries
{service="api-service"} | json | duration > 1000 | queryName =~ ".*"

# Find all authentication failures
{service="auth-service"} | json | message =~ "(?i)failed.*login"
```

## Correlation and Tracing

### Automatic Correlation

Use the correlation middleware to automatically track requests:

```typescript
import { correlationMiddleware } from '@intelgraph/logger/middleware';

app.use(correlationMiddleware({
  generateIfMissing: true,
  setResponseHeaders: true,
  logRequests: true,
}));
```

### Manual Correlation Context

```typescript
import { withCorrelationContext, logger } from '@intelgraph/logger';

withCorrelationContext(
  {
    correlationId: 'custom-id',
    userId: user.id,
    tenantId: tenant.id,
  },
  () => {
    logger.info('Processing in context');
    // All logs here will include the context
  }
);
```

### Distributed Tracing

Combine with OpenTelemetry for full distributed tracing:

```typescript
import { trace } from '@opentelemetry/api';

const span = trace.getActiveSpan();
span?.setAttributes({
  'user.id': user.id,
  'operation.type': 'database_query',
});

logger.info('Database query', {
  // traceId and spanId are automatically included
  query: 'getUserById',
});
```

## Performance Considerations

### Log Sampling

Sample high-frequency events in production:

```typescript
// Sample 10% of debug logs
if (process.env.NODE_ENV === 'production') {
  if (Math.random() < 0.1) {
    logger.debug('High-frequency event', { data });
  }
} else {
  logger.debug('High-frequency event', { data });
}
```

### Lazy Evaluation

Defer expensive operations until needed:

```typescript
// ❌ BAD - Always computes even if not logged
logger.debug('Complex data', {
  expensiveComputation: computeComplexValue(),  // Wasted CPU
});

// ✅ GOOD - Only computes if debug level is enabled
if (logger.level === 'debug') {
  logger.debug('Complex data', {
    expensiveComputation: computeComplexValue(),
  });
}
```

### Batch Logging

For bulk operations, log summaries:

```typescript
// ❌ BAD
items.forEach(item => {
  logger.info('Processing item', { item });
});

// ✅ GOOD
logger.info('Processing batch started', {
  itemCount: items.length,
});

const results = items.map(processItem);

logger.info('Processing batch completed', {
  itemCount: items.length,
  successCount: results.filter(r => r.success).length,
  failureCount: results.filter(r => !r.success).length,
});
```

## Debugging Workflows

### Workflow 1: Trace a User Request

1. **Get correlation ID** from user or response headers
2. **Query logs** using correlation ID

```bash
# Using the log-query tool
log-query --correlation-id "550e8400-e29b-41d4-a716-446655440000" --since 1h

# Using Grafana/Loki directly
{service=~".*"} | json | correlationId="550e8400-e29b-41d4-a716-446655440000"
```

3. **Analyze the flow** through services
4. **Identify bottlenecks** using duration fields

### Workflow 2: Debug Production Error

1. **Check error logs**

```bash
log-query --level error --service api-service --since 1h
```

2. **Get error details**
```logql
{service="api-service", level="error"} | json
```

3. **Find correlation ID** from error log
4. **Trace full request flow**
5. **Check related services**

```logql
{service=~".*"} | json | correlationId="<id>"
```

### Workflow 3: Performance Investigation

1. **Identify slow operations**

```bash
log-analyze --service api-service --since 1h
```

2. **Query specific operation**

```logql
{service="api-service"} | json | operation="calculateAnalytics" | duration > 1000
```

3. **Aggregate metrics**

```logql
sum by (operation) (
  rate({service="api-service"} | json | duration > 1000 [5m])
)
```

4. **Trace slow requests** using correlation ID

### Workflow 4: Security Incident Investigation

1. **Query security events**

```logql
{service=~".*"} | json | level="error" | message =~ "(?i)(unauthorized|forbidden|attack)"
```

2. **Identify affected users/resources**

```logql
{service="auth-service"} | json | eventType="FAILED_LOGIN_ATTEMPT" | ip="192.168.1.1"
```

3. **Check audit logs**

```logql
{service="audit-service"} | json | userId="suspected-user-id"
```

4. **Timeline analysis** using timestamps

## Common Patterns

### Pattern 1: HTTP Request Logging

```typescript
import { loggedHttpRequest } from '@intelgraph/logger/middleware';

async function callExternalAPI() {
  return loggedHttpRequest('external-api', 'GET', url, async () => {
    return await axios.get(url);
  });
}
```

### Pattern 2: Database Query Logging

```typescript
import { loggedQuery } from '@intelgraph/logger/middleware';

async function getUser(id: string) {
  return loggedQuery('getUserById', async () => {
    return await db.users.findById(id);
  });
}
```

### Pattern 3: Error Handling with Context

```typescript
try {
  await processPayment(order);
} catch (error) {
  logger.error('Payment processing failed', error, {
    orderId: order.id,
    amount: order.amount,
    userId: order.userId,
    paymentMethod: order.paymentMethod,
  });

  // Re-throw or handle
  throw new PaymentError('Payment failed', { cause: error });
}
```

### Pattern 4: Audit Logging

```typescript
async function deleteUser(userId: string, deletedBy: string) {
  logger.logAudit(
    'USER_DELETED',
    `users/${userId}`,
    deletedBy,
    true,
    {
      reason: 'GDPR request',
      requestId: req.correlationId,
    }
  );

  await db.users.delete(userId);
}
```

## Troubleshooting

### Problem: Logs not appearing in Loki

**Solution:**

1. Check Loki is running: `curl http://localhost:3100/ready`
2. Check Promtail is running: `curl http://localhost:9080/ready`
3. Verify logger configuration:

```typescript
initializeLogger({
  loki: true,
  lokiUrl: 'http://loki:3100',
});
```

4. Check Loki logs: `docker logs loki`

### Problem: Missing correlation IDs

**Solution:**

1. Ensure middleware is first:

```typescript
app.use(correlationMiddleware());  // MUST be first
app.use(otherMiddleware());
```

2. Verify AsyncLocalStorage is working (Node.js 12.17+)
3. Check for context loss in async operations

### Problem: Too many logs / High costs

**Solution:**

1. Adjust log level to `warn` in production
2. Implement sampling for debug logs
3. Exclude health checks from logging:

```typescript
correlationMiddleware({
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
})
```

4. Review and optimize verbose services

### Problem: Slow log queries

**Solution:**

1. Add more specific labels in Promtail
2. Use time ranges in queries: `--since 1h`
3. Limit query results: `--limit 100`
4. Use appropriate indexes in Loki

## Tools Reference

### CLI Tools

```bash
# Query logs
log-query --service api-service --level error --since 1h

# Analyze logs
log-analyze --service api-service --since 24h

# Follow logs in real-time
log-query --service api-service --follow

# Query by correlation ID
log-query --correlation-id "uuid" --since 1h

# Export to JSON
log-query --service api-service --format json > logs.json
```

### Grafana Explore

Access Grafana at `http://localhost:3001` and use LogQL:

```logql
# All logs for a service
{service="api-service"}

# Errors only
{service="api-service", level="error"}

# Filter by message
{service="api-service"} |= "database"

# Extract JSON fields
{service="api-service"} | json | userId="user-123"

# Aggregate error rate
sum by (service) (rate({level="error"}[5m]))
```

## Additional Resources

- [Loki LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [OpenTelemetry Tracing](https://opentelemetry.io/docs/instrumentation/js/getting-started/)
- [@intelgraph/logger README](../packages/logger/README.md)
- [Log Retention Policy](./LOGGING_RETENTION_POLICY.md)

---

**Version**: 1.0
**Last Updated**: 2025-11-20
**Maintained By**: Platform Engineering Team
