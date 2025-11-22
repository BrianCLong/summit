# Structured Logging Infrastructure

**Issue:** #11813 - Structured Logging with ELK/OpenTelemetry

## Overview

The IntelGraph Platform implements enterprise-grade structured logging with:
- **Winston** - Structured logging library with flexible transports
- **Pino** - High-performance HTTP request logging
- **OpenTelemetry** - Distributed tracing integration
- **Correlation IDs** - Request tracking across services
- **ELK Stack** - Log aggregation and visualization (Elasticsearch, Logstash, Kibana)

## Logging Architecture

```
┌──────────────┐
│ Application  │
│   Logs       │
└──────┬───────┘
       │
       ├──────────────────┬──────────────┐
       │                  │              │
  ┌────▼─────┐      ┌────▼────┐   ┌────▼────┐
  │  Winston │      │  Pino   │   │  OTel   │
  │  Logger  │      │  HTTP   │   │ Tracer  │
  └────┬─────┘      └────┬────┘   └────┬────┘
       │                 │              │
  ┌────▼─────┐      ┌───▼─────┐   ┌───▼─────┐
  │   File   │      │ Console │   │ Jaeger  │
  │ Transport│      │Transport│   │Exporter │
  └────┬─────┘      └─────────┘   └─────────┘
       │
  ┌────▼──────┐
  │ Filebeat  │
  └────┬──────┘
       │
  ┌────▼──────┐
  │ Logstash  │
  └────┬──────┘
       │
  ┌────▼──────────┐
  │Elasticsearch  │
  └────┬──────────┘
       │
  ┌────▼──────┐
  │  Kibana   │
  └───────────┘
```

## Using the Logger

### Basic Logging

```typescript
import logger from './utils/logger';

// Simple logging
logger.info('User logged in');
logger.error('Failed to connect to database');
logger.warn('API rate limit approaching');
logger.debug('Processing request data');

// Structured logging with metadata
logger.info('User authenticated', {
  userId: 'user123',
  email: 'user@example.com',
  ipAddress: req.ip,
});
```

### Logging with Correlation Context

```typescript
import { logWithContext } from './utils/logger';

// Include correlation IDs for request tracking
logWithContext('info', 'Processing payment', {
  correlationId: req.correlationId,
  traceId: req.traceId,
  userId: req.user.id,
}, {
  amount: 100.00,
  currency: 'USD',
});
```

### Performance Logging

```typescript
import { perfLog } from './utils/logger';

const endLog = perfLog('database-query');

// Perform operation
await db.query('SELECT * FROM users');

// Log completion with duration
endLog({ query: 'users', rowCount: 150 });
// Output: "database-query completed in 45ms"
```

### Error Logging

```typescript
import { logError } from './utils/logger';

try {
  await riskyOperation();
} catch (error) {
  logError('Operation failed', error, {
    userId: 'user123',
    operation: 'data-import',
  });
}
```

### Audit Logging

```typescript
import { auditLog } from './utils/logger';

auditLog('USER_LOGIN', {
  userId: 'user123',
  email: 'user@example.com',
  ipAddress: req.ip,
  success: true,
  timestamp: new Date().toISOString(),
});
```

### Child Loggers

```typescript
import { createChildLogger } from './utils/logger';

// Create logger with fixed context
const routerLogger = createChildLogger({
  module: 'auth-router',
  service: 'authentication',
});

routerLogger.info('User logged in', { userId: 'user123' });
// Includes module and service in all logs
```

## Log Levels

Environment-based log levels:

| Environment | Default Level | Override |
|-------------|--------------|----------|
| Production  | `info`       | `LOG_LEVEL=warn` |
| Development | `debug`      | `LOG_LEVEL=debug` |
| Test        | `warn`       | `LOG_LEVEL=error` |

### Setting Log Level

```bash
# .env file
LOG_LEVEL=debug

# Or environment variable
export LOG_LEVEL=info
```

## Correlation IDs

Every request automatically receives:
- **Correlation ID** - Unique identifier for the request
- **Trace ID** - OpenTelemetry trace identifier
- **Span ID** - OpenTelemetry span identifier

These are automatically included in:
- Log messages
- HTTP response headers (`x-correlation-id`, `x-trace-id`)
- Error reports

### Accessing Correlation Context

```typescript
import { getCorrelationContext } from './middleware/correlation-id';

const context = getCorrelationContext(req);
// {
//   correlationId: 'abc123...',
//   traceId: 'def456...',
//   spanId: 'ghi789...',
//   userId: 'user123',
//   tenantId: 'tenant1'
// }
```

## ELK Stack

### Starting the ELK Stack

```bash
# Start ELK stack with main services
docker-compose -f docker-compose.dev.yml -f docker-compose.logging.yml up

# Or standalone
docker-compose -f docker-compose.logging.yml up
```

### Accessing Kibana

1. Navigate to http://localhost:5601
2. Wait for Elasticsearch to initialize
3. Create index pattern: `intelgraph-logs-*`
4. Start exploring logs

### Kibana Dashboards

Create dashboards for:
- Error rates over time
- Request latency (performance logs)
- User activity (audit logs)
- Service health

### Elasticsearch Indices

- `intelgraph-logs-YYYY.MM.DD` - Application logs
- `intelgraph-audit-YYYY.MM.DD` - Audit logs

### Querying Logs

Kibana query examples:

```
# Find errors for a specific user
level:ERROR AND userId:"user123"

# Find slow queries (>1000ms)
performance:true AND duration_ms:>1000

# Find audit events
audit:true AND action:"USER_LOGIN"

# Find requests by correlation ID
correlationId:"abc123-def456"
```

## Log Retention

### File-based Logs

- Location: `/logs`
- `error.log` - Errors only (max 10MB × 5 files)
- `combined.log` - All logs (max 10MB × 10 files)

### Elasticsearch Retention

Configure in Elasticsearch:
```bash
# Delete indices older than 30 days
DELETE /intelgraph-logs-*
{
  "query": {
    "range": {
      "@timestamp": {
        "lt": "now-30d"
      }
    }
  }
}
```

## OpenTelemetry Integration

### Distributed Tracing

Logs automatically include OpenTelemetry trace context:

```json
{
  "message": "Processing request",
  "level": "info",
  "correlationId": "abc123",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7"
}
```

### Jaeger Integration

View traces in Jaeger:
- URL: http://localhost:16686
- Search by trace ID or operation

## Security

### Redacted Fields

Sensitive fields are automatically redacted from logs:
- `password`
- `authorization` headers
- `cookie` headers
- `token`, `secret`, `apiKey`
- `jwt`, `bearer`

Example:
```javascript
logger.info('User login attempt', {
  email: 'user@example.com',
  password: 'secret123',  // Will be redacted
});

// Output:
// { email: 'user@example.com', password: '[REDACTED]' }
```

## Best Practices

### DO

✅ Use structured logging with metadata:
```typescript
logger.info('User action', { userId: 'user123', action: 'login' });
```

✅ Include correlation IDs for request tracking:
```typescript
logger.info('Request processed', { correlationId: req.correlationId });
```

✅ Use appropriate log levels:
```typescript
logger.error('Critical error');  // Errors that need attention
logger.warn('Approaching limit'); // Warnings
logger.info('User logged in');    // Important events
logger.debug('Request data: ...'); // Debugging info
```

✅ Log performance metrics:
```typescript
const end = perfLog('operation');
await operation();
end({ resultCount: 100 });
```

### DON'T

❌ Log sensitive data without redaction:
```typescript
logger.info('Password:', password); // NEVER!
```

❌ Use string concatenation:
```typescript
logger.info('User ' + userId + ' logged in'); // BAD
```

❌ Log at incorrect levels:
```typescript
logger.error('User logged in'); // Wrong level
```

## Configuration

### Winston Configuration

Located in `/server/src/utils/logger.ts`:

```typescript
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

### Pino Configuration (HTTP Logging)

In `/server/src/app.ts`:

```typescript
app.use(pinoHttp({
  logger: pino(),
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  customProps: (req) => ({
    correlationId: req.correlationId,
    traceId: req.traceId,
  }),
}));
```

## Troubleshooting

### Logs not appearing in Kibana

1. Check Elasticsearch is running:
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

2. Verify Logstash is processing logs:
   ```bash
   curl http://localhost:9600/_node/stats/pipelines
   ```

3. Check Filebeat is shipping logs:
   ```bash
   docker-compose -f docker-compose.logging.yml logs filebeat
   ```

### High log volume

Adjust log level in production:
```bash
LOG_LEVEL=warn
```

Reduce file retention:
```typescript
maxsize: 5242880,  // 5MB
maxFiles: 3,
```

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Pino Documentation](https://getpino.io/)
- [OpenTelemetry](https://opentelemetry.io/)
- [Elasticsearch](https://www.elastic.co/elasticsearch/)
- [Kibana](https://www.elastic.co/kibana/)
