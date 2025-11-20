# Logging Infrastructure Migration Guide

This guide helps you migrate existing services to use the new standardized `@intelgraph/logger` package.

## Overview

The new logging infrastructure provides:

- ✅ Standardized structured logging across all services
- ✅ Automatic correlation ID tracking
- ✅ Loki log aggregation
- ✅ OpenTelemetry integration
- ✅ Sensitive data redaction
- ✅ Performance optimization

## Migration Steps

### Step 1: Install Dependencies

Add the logger package to your service:

```bash
# In your service directory
pnpm add @intelgraph/logger

# Or for the whole workspace
pnpm add @intelgraph/logger --filter @intelgraph/your-service
```

### Step 2: Replace Existing Logger

#### Before (Old Winston Logger)

```typescript
// server/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

export default logger;
```

#### After (New Standardized Logger)

```typescript
// server/src/utils/logger.ts
import { initializeLogger } from '@intelgraph/logger';

export const logger = initializeLogger({
  serviceName: 'intelgraph-api',
  level: process.env.LOG_LEVEL || 'info',
  loki: process.env.LOKI_ENABLED === 'true',
  console: true,
  file: process.env.NODE_ENV === 'production',
});

export default logger;
```

### Step 3: Update Imports

Update all files that import the logger:

```typescript
// Before
import logger from './utils/logger';
import logger from '../utils/logger';

// After (no change in import, just update the logger.ts file)
import logger from './utils/logger';
```

### Step 4: Add Correlation Middleware

#### Express Applications

```typescript
// server/src/app.ts or server.ts
import { correlationMiddleware } from '@intelgraph/logger/middleware';

const app = express();

// Add correlation middleware FIRST (before other middleware)
app.use(correlationMiddleware({
  generateIfMissing: true,
  setResponseHeaders: true,
  logRequests: true,
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
}));

// Your other middleware
app.use(express.json());
app.use(routes);
```

#### GraphQL Applications

```typescript
// server/src/graphql/server.ts
import { createGraphQLLoggingPlugin } from '@intelgraph/logger/middleware';
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    createGraphQLLoggingPlugin(),
    // ...other plugins
  ],
});
```

### Step 5: Update Logging Calls (Optional)

The logger is backward compatible, but you can enhance logging:

#### Before

```typescript
logger.info('User created');
logger.error('Failed to create user', { error: err.message });
```

#### After (Enhanced with Structured Logger)

```typescript
import { StructuredLogger } from '@intelgraph/logger';

const log = new StructuredLogger();

log.info('User created', { userId: user.id, email: user.email });
log.error('Failed to create user', error, { userId, operation: 'create' });
```

### Step 6: Update Environment Variables

Add new environment variables to `.env`:

```bash
# Logging Configuration
LOG_LEVEL=info
LOG_DIR=logs
LOKI_ENABLED=true
LOKI_URL=http://loki:3100
```

### Step 7: Remove Old Logger Files

After migration, remove old logger implementations:

```bash
# Example cleanup
rm -f server/src/config/logger.ts
rm -f server/logger.js
rm -f server/logger.ts
```

Keep only the new standardized logger in `server/src/utils/logger.ts`.

## Service-Specific Examples

### Example 1: Migrating API Service

```typescript
// services/api/src/index.ts

// Before
import winston from 'winston';
const logger = winston.createLogger({ /* config */ });

// After
import { initializeLogger, logger } from '@intelgraph/logger';

initializeLogger({
  serviceName: 'api-service',
  level: 'info',
  loki: true,
});

// Use logger as before
logger.info('API service starting');
```

### Example 2: Migrating Worker Service

```typescript
// workers/ingest/src/index.ts

import { initializeLogger, logger, withCorrelationContext } from '@intelgraph/logger';

initializeLogger({
  serviceName: 'ingest-worker',
  level: 'debug',  // Workers often need more detailed logs
  loki: true,
});

// Process jobs with correlation context
async function processJob(job) {
  await withCorrelationContext(
    {
      correlationId: job.id,
      userId: job.data.userId,
    },
    async () => {
      logger.info('Processing job', { jobType: job.type });
      // All logs in this context will include correlationId and userId
      await job.process();
    }
  );
}
```

### Example 3: Migrating GraphQL Resolvers

```typescript
// services/api/src/resolvers/user.ts

import { loggedResolver } from '@intelgraph/logger/middleware';

const resolvers = {
  Query: {
    // Before
    user: async (parent, { id }, context) => {
      logger.info('Fetching user', { id });
      return await context.dataSources.users.findById(id);
    },

    // After (with automatic logging)
    user: loggedResolver('Query.user', async (parent, { id }, context) => {
      return await context.dataSources.users.findById(id);
    }),
  },
};
```

### Example 4: Migrating Database Calls

```typescript
// services/api/src/db/users.ts

import { loggedQuery } from '@intelgraph/logger/middleware';

// Before
async function getUserById(id: string) {
  logger.debug('Getting user', { id });
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  logger.debug('User retrieved', { id, found: !!result });
  return result;
}

// After (with automatic timing)
async function getUserById(id: string) {
  return loggedQuery('getUserById', async () => {
    return await db.query('SELECT * FROM users WHERE id = $1', [id]);
  });
}
```

## Testing Your Migration

### 1. Verify Logs Appear

```bash
# Start your service
npm run dev

# Check logs in console (should see structured JSON)

# Query Loki
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service="your-service"}' \
  --data-urlencode 'limit=10'
```

### 2. Verify Correlation IDs

```bash
# Make a request
curl -i http://localhost:3000/api/test

# Check response headers for x-correlation-id
# Search logs by correlation ID
log-query --correlation-id "the-correlation-id" --since 1h
```

### 3. Verify OpenTelemetry Integration

```bash
# Check Jaeger UI
open http://localhost:16686

# Search for your service traces
# Verify logs correlate with traces using traceId
```

## Common Issues

### Issue 1: Logs Not Appearing in Loki

**Cause**: Loki not enabled or unreachable

**Solution**:
```typescript
// Check configuration
initializeLogger({
  serviceName: 'my-service',
  loki: true,  // Must be true
  lokiUrl: 'http://loki:3100',  // Must be correct
});

// Verify Loki is running
// docker ps | grep loki
```

### Issue 2: Missing Correlation IDs

**Cause**: Middleware not installed or in wrong order

**Solution**:
```typescript
// Ensure correlation middleware is FIRST
app.use(correlationMiddleware());  // FIRST!
app.use(express.json());           // After
app.use(routes);                   // After
```

### Issue 3: Duplicate Logs

**Cause**: Both old and new loggers running

**Solution**:
- Remove old logger files
- Ensure only one logger is initialized
- Check imports

### Issue 4: Performance Impact

**Cause**: Too many debug logs in production

**Solution**:
```bash
# Set appropriate log level in production
LOG_LEVEL=info  # or warn

# Exclude health checks
excludePaths: ['/health', '/metrics']
```

## Rollback Procedure

If you need to rollback:

1. **Revert logger initialization**
```bash
git checkout HEAD -- server/src/utils/logger.ts
```

2. **Remove middleware**
```typescript
// Comment out or remove
// app.use(correlationMiddleware());
```

3. **Remove package**
```bash
pnpm remove @intelgraph/logger
```

4. **Restore old logs**
```bash
git checkout HEAD -- logs/
```

## Migration Checklist

Use this checklist for each service:

- [ ] Install `@intelgraph/logger` package
- [ ] Update logger initialization
- [ ] Add correlation middleware (Express)
- [ ] Add GraphQL logging plugin (if GraphQL)
- [ ] Update environment variables
- [ ] Test locally
- [ ] Verify logs in Loki
- [ ] Verify correlation IDs work
- [ ] Check OpenTelemetry traces
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] Remove old logger code

## Support

If you encounter issues during migration:

1. Check this guide first
2. Review [Logging Best Practices](./LOGGING_BEST_PRACTICES.md)
3. Check package README: [packages/logger/README.md](../packages/logger/README.md)
4. Ask in #platform-engineering Slack channel
5. Create an issue in the repo

## Next Steps

After migration:

1. Set up log dashboards in Grafana
2. Configure alerts for error rates
3. Train team on LogQL queries
4. Review retention policies
5. Optimize log levels per service

---

**Version**: 1.0
**Last Updated**: 2025-11-20
**Questions?** Contact Platform Engineering Team
