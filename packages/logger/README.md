# @intelgraph/logger

Standardized structured logging for the IntelGraph platform with correlation ID tracking, OpenTelemetry integration, and Loki log aggregation support.

## Features

- **Structured Logging**: JSON-formatted logs with consistent schema
- **Correlation Tracking**: Automatic correlation ID propagation across distributed services
- **OpenTelemetry Integration**: Seamless integration with existing tracing infrastructure
- **Loki Support**: Direct log shipping to Loki for centralized log aggregation
- **Multiple Outputs**: Console, file (with rotation), and Loki
- **Sensitive Data Sanitization**: Automatic redaction of passwords, tokens, and secrets
- **Performance Optimized**: Minimal overhead for production use
- **TypeScript First**: Full type safety and IntelliSense support

## Installation

```bash
pnpm add @intelgraph/logger
```

## Quick Start

### Basic Usage

```typescript
import { initializeLogger, logger } from '@intelgraph/logger';

// Initialize logger for your service
initializeLogger({
  serviceName: 'my-service',
  level: 'info',
  console: true,
  file: true,
  loki: true,
});

// Simple logging
logger.info('Application started');
logger.error('An error occurred', new Error('Something went wrong'));
logger.warn('Warning message', { userId: '123', action: 'delete' });
```

### Express Integration

```typescript
import express from 'express';
import { correlationMiddleware, errorLoggingMiddleware } from '@intelgraph/logger/middleware';

const app = express();

// Add correlation middleware first
app.use(correlationMiddleware({
  generateIfMissing: true,
  setResponseHeaders: true,
  logRequests: true,
  excludePaths: ['/health', '/metrics'],
}));

// Your routes
app.get('/api/users', async (req, res) => {
  // Logger automatically includes correlation context
  logger.info('Fetching users');
  const users = await getUsers();
  res.json(users);
});

// Add error logging middleware last
app.use(errorLoggingMiddleware());
```

### GraphQL Integration

```typescript
import { ApolloServer } from '@apollo/server';
import { createGraphQLLoggingPlugin } from '@intelgraph/logger/middleware';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    createGraphQLLoggingPlugin(),
  ],
});
```

### GraphQL Resolver Logging

```typescript
import { loggedResolver } from '@intelgraph/logger/middleware';

const resolvers = {
  Query: {
    user: loggedResolver('Query.user', async (parent, { id }, context, info) => {
      return await context.dataSources.users.findById(id);
    }),
  },
};
```

### Database Query Logging

```typescript
import { loggedQuery } from '@intelgraph/logger/middleware';

async function getUsers() {
  return loggedQuery('getUsers', async () => {
    return await db.query('SELECT * FROM users');
  });
}
```

### HTTP Request Logging

```typescript
import { loggedHttpRequest } from '@intelgraph/logger/middleware';
import axios from 'axios';

async function callExternalService() {
  return loggedHttpRequest('external-api', 'GET', 'https://api.example.com/data', async () => {
    return await axios.get('https://api.example.com/data');
  });
}
```

## Configuration

### Logger Configuration Options

```typescript
interface LoggerConfig {
  serviceName: string;          // Required: Service identifier
  level?: string;                // Log level (default: 'info')
  environment?: string;          // Environment (default: NODE_ENV)
  console?: boolean;             // Enable console logging (default: true)
  file?: boolean;                // Enable file logging (default: true in production)
  logDir?: string;              // Log directory (default: 'logs')
  loki?: boolean;                // Enable Loki (default: false)
  lokiUrl?: string;             // Loki URL (default: 'http://loki:3100')
  json?: boolean;                // JSON format (default: true in production)
  colorize?: boolean;            // Colorize console (default: true in development)
  defaultMeta?: object;          // Additional static metadata
  maxFileSize?: string;          // Max log file size (default: '100m')
  maxFiles?: string;             // Log retention (default: '30d')
}
```

### Environment Variables

```bash
LOG_LEVEL=info                 # Minimum log level
NODE_ENV=production            # Environment
LOG_DIR=/var/log/intelgraph   # Log directory
LOKI_ENABLED=true              # Enable Loki integration
LOKI_URL=http://loki:3100     # Loki server URL
```

## Log Levels

Follows RFC 5424 syslog levels:

- `error`: Error events
- `warn`: Warning events
- `info`: Informational messages (default)
- `http`: HTTP request logging
- `verbose`: Verbose informational messages
- `debug`: Debug messages
- `silly`: Very detailed debug messages

## Structured Logging

All logs include automatic enrichment with:

- `timestamp`: ISO 8601 timestamp
- `level`: Log level
- `message`: Log message
- `service`: Service name
- `environment`: Environment (dev/staging/prod)
- `correlationId`: Request correlation ID
- `traceId`: OpenTelemetry trace ID
- `spanId`: OpenTelemetry span ID
- `userId`: User ID (if available)
- `requestId`: Unique request ID

### Log Structure Example

```json
{
  "timestamp": "2025-11-20T10:30:45.123Z",
  "level": "info",
  "message": "User login successful",
  "service": "auth-service",
  "environment": "production",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "userId": "user123",
  "requestId": "req-abc123",
  "method": "POST",
  "url": "/api/auth/login",
  "duration": 156
}
```

## Correlation Context

The logger automatically tracks correlation context across async operations using AsyncLocalStorage:

```typescript
import { withCorrelationContext, logger } from '@intelgraph/logger';

// Set correlation context
withCorrelationContext(
  {
    correlationId: 'abc-123',
    userId: 'user-456',
  },
  () => {
    // All logs within this context will include the correlation data
    logger.info('Processing user request');

    someAsyncFunction(); // Still has access to correlation context
  }
);
```

## Specialized Logging Methods

### Audit Logging

```typescript
logger.logAudit(
  'USER_DELETED',
  'users/123',
  'admin-user-id',
  true,
  { reason: 'GDPR request' }
);
```

### Security Events

```typescript
logger.logSecurityEvent(
  'FAILED_LOGIN_ATTEMPT',
  'high',
  { ip: '192.168.1.1', username: 'admin' }
);
```

### Performance Metrics

```typescript
logger.logPerformance('calculateAnalytics', 1523, { recordCount: 1000 });
```

### HTTP Requests

```typescript
logger.logHttpRequest('GET', '/api/users', 200, 45, { cached: false });
```

### Database Queries

```typescript
logger.logQuery('getUserById', 23, true, { userId: '123' });
```

## Sensitive Data Redaction

The logger automatically redacts sensitive fields:

```typescript
logger.info('User data', {
  username: 'john',
  password: 'secret123',  // Will be redacted
  apiKey: 'key-abc',      // Will be redacted
  token: 'bearer xyz',    // Will be redacted
});

// Output:
// {
//   username: 'john',
//   password: '[REDACTED]',
//   apiKey: '[REDACTED]',
//   token: '[REDACTED]'
// }
```

## Log Aggregation with Loki

When Loki is enabled, logs are automatically shipped to Loki for centralized querying via Grafana.

### Querying Logs in Grafana

```logql
# All logs for a service
{service="api-service"}

# Error logs only
{service="api-service"} |= "level=error"

# Logs for specific correlation ID
{service="api-service"} | json | correlationId="550e8400-e29b-41d4-a716-446655440000"

# Logs for specific user
{service="api-service"} | json | userId="user123"

# HTTP errors
{service="api-service"} | json | statusCode >= 400
```

## Best Practices

1. **Initialize Once**: Initialize the logger once at application startup
2. **Use Correlation Context**: Always use middleware to establish correlation context
3. **Structured Data**: Pass context as objects, not string concatenation
4. **Sensitive Data**: Let automatic redaction handle secrets, but be mindful
5. **Log Levels**: Use appropriate log levels (error for errors, info for business events)
6. **Performance**: Avoid logging in tight loops; use debug level for verbose logs
7. **Child Loggers**: Create child loggers for subsystems with additional context

## Examples

### Service Initialization

```typescript
import { initializeLogger, StructuredLogger } from '@intelgraph/logger';

const logger = new StructuredLogger(
  initializeLogger({
    serviceName: 'user-service',
    level: process.env.LOG_LEVEL || 'info',
    loki: process.env.NODE_ENV === 'production',
  })
);

export { logger };
```

### Request Handler

```typescript
app.post('/api/users', async (req, res) => {
  logger.info('Creating user', { email: req.body.email });

  try {
    const user = await createUser(req.body);
    logger.logAudit('USER_CREATED', `users/${user.id}`, req.user.id, true);
    res.json(user);
  } catch (error) {
    logger.error('Failed to create user', error, { email: req.body.email });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Troubleshooting

### Logs not appearing in Loki

1. Check Loki URL is correct
2. Verify Loki service is running
3. Check network connectivity
4. Review Loki logs for errors

### Missing correlation IDs

1. Ensure correlation middleware is first in middleware chain
2. Verify AsyncLocalStorage is working (Node.js 12.17+ required)
3. Check that you're not losing context in async operations

### High log volume

1. Adjust log level to `info` or `warn` in production
2. Use `excludePaths` to skip health checks and metrics
3. Enable log sampling if needed

## License

MIT
