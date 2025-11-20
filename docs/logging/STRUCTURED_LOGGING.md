# Structured Logging Guide

## Overview

This document describes the IntelGraph structured logging system, which provides comprehensive logging with correlation IDs, audit trails, and centralized log management.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Logger Package](#logger-package)
- [Correlation IDs](#correlation-ids)
- [Audit Logging](#audit-logging)
- [Sensitive Data Redaction](#sensitive-data-redaction)
- [Log Levels](#log-levels)
- [Configuration](#configuration)
- [Log Rotation and Retention](#log-rotation-and-retention)
- [Log Aggregation](#log-aggregation)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Quick Start

### Installation

```bash
pnpm add @intelgraph/logger
```

### Basic Usage

```typescript
import { logger } from '@intelgraph/logger';

// Simple logging
logger.info('User logged in');
logger.error('Database connection failed');

// Structured logging with metadata
logger.info('User action', {
  userId: 'user-123',
  action: 'update-profile',
  tenantId: 'tenant-456',
});

// Error logging
try {
  await someOperation();
} catch (error) {
  logger.error(error, {
    context: 'someOperation',
    userId: 'user-123',
  });
}
```

### Express Middleware Setup

```typescript
import express from 'express';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { auditLoggerMiddleware } from './middleware/audit-logger';

const app = express();

// Add correlation ID tracking (must be first)
app.use(correlationIdMiddleware());

// Add audit logging
app.use(auditLoggerMiddleware({
  excludePaths: ['/health', '/metrics'],
  logOnlyFailures: false,
}));

// Your routes...
app.get('/api/users', (req, res) => {
  logger.info('Fetching users'); // Automatically includes correlation ID
  res.json({ users: [] });
});
```

## Core Concepts

### Structured Logs

All logs are structured JSON objects with consistent fields:

```json
{
  "level": "INFO",
  "timestamp": "2025-11-20T12:00:00.000Z",
  "service": "intelgraph",
  "environment": "production",
  "version": "1.0.0",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "msg": "User action completed",
  "action": "update-profile",
  "duration": 150
}
```

### Log Levels

The system supports the following log levels (from most to least severe):

1. **FATAL** - System is unusable, immediate attention required
2. **ERROR** - Error conditions that need attention
3. **WARN** - Warning conditions that should be reviewed
4. **INFO** - Informational messages about normal operations
5. **DEBUG** - Detailed debugging information
6. **TRACE** - Very detailed tracing information

### Correlation IDs

Correlation IDs track requests across distributed systems and async operations:

- Automatically generated for each request
- Propagated through async contexts
- Included in all log messages
- Sent in response headers for client tracking

## Logger Package

### Creating Logger Instances

```typescript
import { createLogger } from '@intelgraph/logger';

// Default logger
const logger = createLogger();

// Custom logger with options
const customLogger = createLogger({
  level: 'debug',
  pretty: true,
  service: 'my-service',
  environment: 'staging',
  version: '2.0.0',
});
```

### Child Loggers

Create child loggers to add context automatically:

```typescript
import { logger } from '@intelgraph/logger';

// Create child logger with user context
const userLogger = logger.child({
  userId: 'user-123',
  tenantId: 'tenant-456',
});

// All logs from this logger include user context
userLogger.info('Profile updated'); // Includes userId and tenantId
userLogger.error('Update failed');  // Includes userId and tenantId
```

### Context Management

Use async context to maintain correlation IDs and metadata:

```typescript
import {
  setCorrelationId,
  setUserId,
  getCorrelationId,
  runWithContext,
} from '@intelgraph/logger';

// Set context values
setCorrelationId('correlation-123');
setUserId('user-123');

// Get context values
const correlationId = getCorrelationId();

// Run code with specific context
runWithContext(
  { correlationId: 'new-id', userId: 'user-456' },
  () => {
    logger.info('This log has the new context');
  }
);
```

## Correlation IDs

### Middleware Usage

```typescript
import { correlationIdMiddleware } from './middleware/correlation-id';

// Basic usage
app.use(correlationIdMiddleware());

// Custom configuration
app.use(correlationIdMiddleware({
  header: 'x-request-id',      // Custom header name
  generateIfMissing: true,      // Generate if not provided
  setResponseHeader: true,      // Include in response
}));
```

### Manual Correlation ID Management

```typescript
import { setCorrelationId, getCorrelationId } from '@intelgraph/logger';

// In your handler
function handleRequest(req, res) {
  const correlationId = req.headers['x-correlation-id'] || generateId();
  setCorrelationId(correlationId);

  logger.info('Processing request'); // Includes correlation ID

  // Pass to other services
  await fetch('https://api.example.com/data', {
    headers: {
      'x-correlation-id': correlationId,
    },
  });
}
```

## Audit Logging

Audit logs track security-critical events for compliance and investigation.

### Automatic Audit Logging

```typescript
import { auditLoggerMiddleware } from './middleware/audit-logger';

app.use(auditLoggerMiddleware({
  logAllRequests: true,        // Log all requests
  logBodies: false,            // Don't log request/response bodies (privacy)
  excludePaths: ['/health'],   // Exclude health checks
  logOnlyFailures: false,      // Log successes too
}));
```

### Manual Audit Logging

```typescript
import {
  logAuditEvent,
  logAuthSuccess,
  logAuthFailure,
  logAuthzDenied,
  logDataAccess,
  logConfigChange,
  AuditEventType,
} from '@intelgraph/logger';

// Authentication events
logAuthSuccess('user-123', {
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

logAuthFailure('Invalid password', {
  ip: '192.168.1.1',
  details: { attemptedUsername: 'admin' },
});

// Authorization events
logAuthzDenied('document', 'doc-123', 'Insufficient permissions', {
  userId: 'user-123',
  tenantId: 'tenant-456',
});

// Data access events
logDataAccess('update', 'user', 'user-123', {
  details: { fields: ['email', 'name'] },
});

// Configuration changes
logConfigChange('changed', 'security-policy', {
  oldValue: 'permissive',
  newValue: 'strict',
});

// Custom audit event
logAuditEvent({
  userId: 'user-123',
  action: 'custom.action',
  resourceType: 'custom-resource',
  resourceId: 'resource-123',
  result: 'success',
  details: { foo: 'bar' },
});
```

### Audit Event Types

```typescript
// Authentication
AuditEventType.AUTH_LOGIN_SUCCESS
AuditEventType.AUTH_LOGIN_FAILURE
AuditEventType.AUTH_LOGOUT
AuditEventType.AUTH_PASSWORD_CHANGE

// Authorization
AuditEventType.AUTHZ_ACCESS_GRANTED
AuditEventType.AUTHZ_ACCESS_DENIED
AuditEventType.AUTHZ_PERMISSION_GRANTED
AuditEventType.AUTHZ_ROLE_ASSIGNED

// Data Access
AuditEventType.DATA_READ
AuditEventType.DATA_CREATE
AuditEventType.DATA_UPDATE
AuditEventType.DATA_DELETE

// Configuration
AuditEventType.CONFIG_CHANGED
AuditEventType.CONFIG_CREATED
AuditEventType.CONFIG_DELETED

// Security
AuditEventType.SECURITY_BREACH_ATTEMPT
AuditEventType.SECURITY_POLICY_VIOLATION
AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED
```

## Sensitive Data Redaction

The logging system automatically redacts sensitive information to protect privacy and security.

### Automatic Redaction

Sensitive fields are automatically redacted:

```typescript
import { logger } from '@intelgraph/logger';

// These fields are automatically redacted
logger.info('User data', {
  username: 'john',
  password: 'secret123',        // -> [REDACTED]
  apiKey: 'key-123',            // -> [REDACTED]
  token: 'token-456',           // -> [REDACTED]
  ssn: '123-45-6789',           // -> [REDACTED]
  creditCard: '1234-5678-9012', // -> [REDACTED]
});
```

### Manual Redaction

```typescript
import {
  redactSensitiveData,
  redactEmail,
  redactCreditCard,
  redactSSN,
  redactPhone,
} from '@intelgraph/logger';

// Redact entire objects
const userData = {
  name: 'John Doe',
  password: 'secret',
  token: 'abc123',
};
const redacted = redactSensitiveData(userData);
// { name: 'John Doe', password: '[REDACTED]', token: '[REDACTED]' }

// Redact specific data types
redactEmail('user@example.com');      // -> 'u***@example.com'
redactCreditCard('1234567890123456'); // -> '************3456'
redactSSN('123-45-6789');             // -> '***-**-6789'
redactPhone('(555) 123-4567');        // -> '***-***-4567'
```

### Custom Redaction Paths

```typescript
import { createLogger } from '@intelgraph/logger';

const logger = createLogger({
  redactPaths: [
    'user.password',
    'user.ssn',
    '*.secretKey',
    'req.headers.authorization',
  ],
});
```

## Configuration

### Environment Variables

```bash
# Log level
LOG_LEVEL=info                    # fatal, error, warn, info, debug, trace

# Service identification
SERVICE_NAME=intelgraph
NODE_ENV=production
APP_VERSION=1.0.0

# Log rotation
LOG_MAX_SIZE=10M                  # Max size per file
LOG_MAX_FILES=10                  # Max number of rotated files
LOG_COMPRESS=true                 # Compress rotated files
LOG_ROTATION_INTERVAL=1d          # Rotation interval (1d, 1h, etc.)

# Log retention
LOG_RETENTION_DAYS=30             # Days to keep application logs
AUDIT_LOG_RETENTION_DAYS=90       # Days to keep audit logs (compliance)
ERROR_LOG_RETENTION_DAYS=60       # Days to keep error logs
LOG_ARCHIVE_BEFORE_DELETE=true    # Archive before deletion

# Log aggregation (ELK stack)
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_SERVICE=elasticsearch

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=intelgraph-logs
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# Logstash
LOGSTASH_HOST=localhost
LOGSTASH_PORT=5000
LOGSTASH_PROTOCOL=tcp

# CloudWatch
CLOUDWATCH_LOG_GROUP=/aws/intelgraph
CLOUDWATCH_LOG_STREAM=app-logs
AWS_REGION=us-east-1
```

### Programmatic Configuration

```typescript
import { createLogger } from '@intelgraph/logger';
import loggingConfig from './config/logging';

const logger = createLogger(loggingConfig.application);
```

## Log Rotation and Retention

### Rotation Policies

Logs are automatically rotated based on:

- **Size**: When files exceed `LOG_MAX_SIZE` (default: 10MB)
- **Time**: Based on `LOG_ROTATION_INTERVAL` (default: daily)

Rotated files are named with timestamps:
```
application-2025-11-20.log
application-2025-11-19.log.gz
```

### Retention Policies

Logs are retained for different periods based on type:

- **Application logs**: 30 days (configurable)
- **Audit logs**: 90 days (compliance requirement)
- **Error logs**: 60 days (extended for investigation)

Old logs can be:
1. Deleted automatically
2. Archived to S3/cloud storage
3. Kept indefinitely (set retention to 0)

### Manual Cleanup

```bash
# Clean up old logs (respects retention policy)
node scripts/cleanup-logs.js

# Archive old logs to S3
LOG_ARCHIVE_DESTINATION=s3://my-bucket/logs node scripts/archive-logs.js
```

## Log Aggregation

### ELK Stack (Elasticsearch, Logstash, Kibana)

#### Elasticsearch Configuration

```typescript
import loggingConfig from './config/logging';

// logs are automatically shipped to Elasticsearch if configured
// via environment variables (see Configuration section)
```

#### Logstash Configuration

Create `logstash.conf`:

```
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  json {
    source => "message"
  }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "intelgraph-logs-%{+YYYY.MM.dd}"
  }
}
```

Start Logstash:
```bash
logstash -f logstash.conf
```

#### Kibana Dashboards

1. Access Kibana at `http://localhost:5601`
2. Create index pattern: `intelgraph-logs-*`
3. View logs in Discover tab
4. Create dashboards for:
   - Error rates
   - Request latency
   - Audit events
   - Authentication attempts

### CloudWatch Logs

```bash
# Enable CloudWatch logging
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_SERVICE=cloudwatch
CLOUDWATCH_LOG_GROUP=/aws/intelgraph
AWS_REGION=us-east-1
```

### Custom Aggregation

```bash
# Send logs to custom HTTP endpoint
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_SERVICE=custom
LOG_AGGREGATION_URL=https://logs.example.com/ingest
LOG_AGGREGATION_METHOD=POST
```

## Best Practices

### 1. Use Structured Logging

❌ **Don't:**
```typescript
logger.info(`User ${userId} updated profile at ${new Date()}`);
```

✅ **Do:**
```typescript
logger.info('User updated profile', {
  userId,
  timestamp: new Date().toISOString(),
  action: 'update-profile',
});
```

### 2. Choose Appropriate Log Levels

- **FATAL**: System crash, immediate action needed
- **ERROR**: Operation failed, needs attention
- **WARN**: Unexpected condition, but handled
- **INFO**: Normal operations, state changes
- **DEBUG**: Detailed information for debugging
- **TRACE**: Very detailed tracing (usually disabled)

### 3. Include Context

Always include relevant context:

```typescript
logger.error('Database query failed', {
  query: 'SELECT * FROM users',
  error: err.message,
  userId,
  tenantId,
  duration: elapsed,
});
```

### 4. Use Child Loggers

Create child loggers for specific contexts:

```typescript
// In a service class
class UserService {
  private logger = logger.child({ service: 'UserService' });

  async updateUser(userId: string) {
    const userLogger = this.logger.child({ userId });
    userLogger.info('Starting user update');
    // ...
    userLogger.info('User update completed');
  }
}
```

### 5. Don't Log Sensitive Data

Never log:
- Passwords, tokens, API keys
- Credit card numbers, SSNs
- Personal identification information
- Full authorization headers

The redaction system catches most, but be careful!

### 6. Log Errors Properly

```typescript
// ❌ Don't stringify errors
logger.error(err.toString());

// ✅ Pass error object directly
logger.error(err, {
  context: 'user-update',
  userId,
});
```

### 7. Use Correlation IDs

Always use the correlation ID middleware:

```typescript
// At the top of your middleware stack
app.use(correlationIdMiddleware());
```

### 8. Audit Security Events

Always audit:
- Authentication attempts (success and failure)
- Authorization failures
- Data modifications
- Configuration changes
- Suspicious activity

```typescript
import { logAuthSuccess, logAuthFailure } from '@intelgraph/logger';

async function login(username: string, password: string) {
  try {
    const user = await authenticate(username, password);
    logAuthSuccess(user.id, { username });
    return user;
  } catch (err) {
    logAuthFailure('Invalid credentials', { username });
    throw err;
  }
}
```

### 9. Performance Considerations

- Use appropriate log levels in production (INFO or WARN)
- Don't log in tight loops
- Use sampling for high-frequency events
- Avoid logging large objects

```typescript
// ❌ Don't log in loops
for (const item of items) {
  logger.debug('Processing item', item);
}

// ✅ Log summary
logger.info('Processing items', { count: items.length });
```

### 10. Testing

Mock the logger in tests:

```typescript
import { logger } from '@intelgraph/logger';

jest.mock('@intelgraph/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    // ...
  },
}));
```

## Examples

### Express Application

```typescript
import express from 'express';
import { logger } from '@intelgraph/logger';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { auditLoggerMiddleware } from './middleware/audit-logger';

const app = express();

// Middleware
app.use(express.json());
app.use(correlationIdMiddleware());
app.use(auditLoggerMiddleware());

// Routes
app.post('/api/users', async (req, res) => {
  const requestLogger = logger.child({ endpoint: '/api/users' });

  try {
    requestLogger.info('Creating user', { body: req.body });

    const user = await createUser(req.body);

    requestLogger.info('User created successfully', { userId: user.id });

    res.status(201).json(user);
  } catch (error) {
    requestLogger.error(error, {
      context: 'user-creation',
      body: req.body,
    });

    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.listen(3000, () => {
  logger.info('Server started', { port: 3000 });
});
```

### Microservice

```typescript
import { logger, setCorrelationId } from '@intelgraph/logger';

class OrderService {
  private logger = logger.child({ service: 'OrderService' });

  async processOrder(orderId: string, correlationId?: string) {
    if (correlationId) {
      setCorrelationId(correlationId);
    }

    const orderLogger = this.logger.child({ orderId });

    orderLogger.info('Processing order');

    try {
      const order = await this.getOrder(orderId);
      orderLogger.debug('Order retrieved', { order });

      await this.validateOrder(order);
      orderLogger.info('Order validated');

      await this.chargePayment(order);
      orderLogger.info('Payment charged');

      await this.shipOrder(order);
      orderLogger.info('Order shipped');

      return order;
    } catch (error) {
      orderLogger.error(error, { context: 'order-processing' });
      throw error;
    }
  }
}
```

### Background Job

```typescript
import { logger, runWithContext } from '@intelgraph/logger';
import { v4 as uuid } from 'uuid';

async function processJobs() {
  const jobs = await getJobs();

  for (const job of jobs) {
    // Create isolated context for each job
    await runWithContext(
      {
        correlationId: uuid(),
        jobId: job.id,
      },
      async () => {
        logger.info('Processing job', { jobType: job.type });

        try {
          await job.execute();
          logger.info('Job completed successfully');
        } catch (error) {
          logger.error(error, {
            context: 'job-execution',
            jobType: job.type,
          });
        }
      }
    );
  }
}
```

## Additional Resources

- [Pino Documentation](https://getpino.io/)
- [ELK Stack Guide](https://www.elastic.co/elastic-stack)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Structured Logging Best Practices](https://stackify.com/what-is-structured-logging-and-why-developers-need-it/)
