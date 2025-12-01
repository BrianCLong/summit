# @intelgraph/logger

Shared structured logging package for the Summit/IntelGraph platform.

## Features

- 📝 **Structured JSON Logging**: Uses Pino for high-performance structured logs
- 🔗 **OpenTelemetry Correlation**: Automatically includes trace IDs and span IDs in logs
- 🎨 **Environment-Aware**: Pretty-printed logs in development, JSON in production
- 🔒 **Redaction**: Automatic redaction of sensitive fields (passwords, tokens, etc.)
- 🏷️ **Consistent Schema**: Standard log format across all services
- 📊 **Metrics Integration**: Links logs to traces and metrics in Grafana

## Installation

```bash
pnpm add @intelgraph/logger
```

## Quick Start

```typescript
import createLogger from '@intelgraph/logger';

const logger = createLogger({
  serviceName: 'summit-api',
  level: 'info',
});

logger.info('Application started');
logger.info({ port: 4000 }, 'Server listening');
```

## Configuration

### Logger Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceName` | string | **required** | Name of the service (e.g., 'summit-api') |
| `level` | string | `'info'` | Log level (trace, debug, info, warn, error, fatal) |
| `prettyPrint` | boolean | `NODE_ENV !== 'production'` | Enable pretty-printed logs |
| `redact` | string[] | `['password', 'token', ...]` | Fields to redact from logs |

### Environment Variables

- `LOG_LEVEL`: Override default log level
- `NODE_ENV`: Determines pretty printing (off in production)
- `SERVICE_VERSION`: Included in log metadata
- `HOSTNAME`: Included in log metadata

## Usage

### Basic Logging

```typescript
logger.info('Simple message');
logger.info({ key: 'value' }, 'Message with context');
logger.error({ err: error }, 'Error occurred');
```

### Child Loggers

Create child loggers with additional context:

```typescript
import { createChildLogger } from '@intelgraph/logger';

const requestLogger = createChildLogger(logger, {
  requestId: 'req-123',
  userId: 'user-456',
});

requestLogger.info('Processing request'); // Includes requestId and userId
```

### Express Middleware

Automatically add request context to logs:

```typescript
import { createLogMiddleware } from '@intelgraph/logger';
import express from 'express';

const app = express();
app.use(createLogMiddleware(logger));

app.get('/api/users', (req, res) => {
  req.log.info('Fetching users'); // Includes request context
  res.json({ users: [] });
});
```

### OpenTelemetry Correlation

Logs automatically include trace IDs when running in an instrumented service:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('summit-api');
const span = tracer.startSpan('process-order');

// This log will include traceId and spanId
logger.info({ orderId: '123' }, 'Processing order');

span.end();
```

Output:
```json
{
  "level": "INFO",
  "time": "2025-11-20T12:00:00.000Z",
  "service": "summit-api",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "orderId": "123",
  "msg": "Processing order"
}
```

### Log with Span Attributes

Add log data as span attributes for better correlation:

```typescript
import { logWithSpan, LogLevel } from '@intelgraph/logger';

logWithSpan(
  logger,
  LogLevel.INFO,
  'Database query executed',
  {
    query: 'SELECT * FROM entities',
    duration: 150,
    rowCount: 42,
  }
);
```

## Log Schema

All logs follow this consistent schema:

```typescript
{
  level: string;           // Log level (INFO, WARN, ERROR, etc.)
  time: string;            // ISO 8601 timestamp
  service: string;         // Service name
  environment: string;     // Environment (development, production)
  version: string;         // Service version
  traceId?: string;        // OpenTelemetry trace ID
  spanId?: string;         // OpenTelemetry span ID
  msg: string;             // Log message
  [key: string]: any;      // Additional context
}
```

## Sensitive Data Redaction

By default, the following fields are redacted:
- `password`
- `token`
- `secret`
- `apiKey`
- `authorization`

Customize redaction:

```typescript
const logger = createLogger({
  serviceName: 'auth-service',
  redact: ['password', 'ssn', 'creditCard', 'cvv'],
});

logger.info({
  username: 'john',
  password: 'super-secret', // Will be [Redacted]
}, 'User login');
```

## Integration with Grafana/Loki

Logs are automatically correlated with traces in Grafana:

1. Logs include `traceId` and `spanId`
2. Loki extracts these fields
3. Click "Trace" in Grafana logs view to jump to trace
4. Click "Logs" in Jaeger trace view to jump to logs

## Best Practices

### DO ✅

- Use structured logging with context objects
- Include relevant business context (userId, orderId, etc.)
- Use child loggers for request-scoped context
- Log at appropriate levels (info for business events, debug for details)
- Include error objects with `{ err: error }`

### DON'T ❌

- Don't log sensitive data (passwords, tokens, PII)
- Don't use string concatenation for messages
- Don't log at trace/debug level in production
- Don't create a new logger per request (use child loggers)
- Don't use console.log (use logger instead)

## Examples

See `src/examples.ts` for comprehensive usage examples.

## Migration from Winston

Migrating from Winston to Pino:

```typescript
// Before (Winston)
import winston from 'winston';
const logger = winston.createLogger({ ... });
logger.info('Message', { key: 'value' });

// After (Pino)
import createLogger from '@intelgraph/logger';
const logger = createLogger({ serviceName: 'my-service' });
logger.info({ key: 'value' }, 'Message');
```

Key differences:
- Pino uses `(object, message)` format instead of `(message, object)`
- Errors should be in `{ err: error }` not `{ error }`
- No need for transports configuration (handled automatically)

## License

Proprietary - Internal use only
